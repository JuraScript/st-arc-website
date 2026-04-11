/**
 * Ingest endpoint — receives pre-chunked, pre-embedded documents from the Python indexer
 * Body shape:
 * {
 *   doc_id: "2025-uskrs",
 *   doc_metadata: { source_type: "pdf", catalog_name: "Uskrs 2025", year: 2025, ... },
 *   chunks: [
 *     { text: "...", embedding: [...], metadata: { page: 12, ... } },
 *     ...
 *   ]
 * }
 */

export async function handleIngest(request, env) {
  // Auth: same admin password
  const password = request.headers.get('X-Admin-Password');
  if (!password || password !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const body = await request.json();
  const { doc_id, doc_metadata, chunks } = body;

  if (!doc_id || !Array.isArray(chunks) || chunks.length === 0) {
    return jsonResponse({ error: 'Invalid payload' }, 400);
  }

  // First, remove existing vectors for this doc (re-indexing case)
  const existingIdsRaw = await env.SETTINGS.get(`doc_vectors:${doc_id}`);
  if (existingIdsRaw) {
    const existingIds = JSON.parse(existingIdsRaw);
    for (let i = 0; i < existingIds.length; i += 1000) {
      try {
        await env.VECTORIZE.deleteByIds(existingIds.slice(i, i + 1000));
      } catch (e) {
        console.error('Delete batch failed:', e);
      }
    }
  }

  // Insert new vectors
  const vectors = chunks.map((chunk, i) => ({
    id: `${doc_id}__chunk_${i}`,
    values: chunk.embedding,
    metadata: {
      ...doc_metadata,
      ...chunk.metadata,
      doc_id,
      text: chunk.text.slice(0, 9000), // Vectorize metadata size limit
    },
  }));

  const vectorIds = vectors.map((v) => v.id);

  // Vectorize accepts max 1000 vectors per upsert
  for (let i = 0; i < vectors.length; i += 1000) {
    await env.VECTORIZE.upsert(vectors.slice(i, i + 1000));
  }

  // Track vector IDs for this doc (for future deletion)
  await env.SETTINGS.put(`doc_vectors:${doc_id}`, JSON.stringify(vectorIds));

  // Update documents index
  const docsRaw = await env.SETTINGS.get('documents_index');
  const docs = docsRaw ? JSON.parse(docsRaw) : [];
  const existingIdx = docs.findIndex((d) => d.id === doc_id);
  const docEntry = {
    id: doc_id,
    ...doc_metadata,
    chunks_count: chunks.length,
    indexed_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    docs[existingIdx] = docEntry;
  } else {
    docs.push(docEntry);
  }
  await env.SETTINGS.put('documents_index', JSON.stringify(docs));

  return jsonResponse({
    success: true,
    doc_id,
    chunks_indexed: chunks.length,
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
