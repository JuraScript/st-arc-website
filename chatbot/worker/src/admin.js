/**
 * Admin endpoints (password-protected)
 * - GET  /api/admin/settings        → get system prompt + overrides
 * - POST /api/admin/settings        → update system prompt + overrides
 * - GET  /api/admin/logs            → recent conversation logs
 * - GET  /api/admin/documents       → list indexed documents
 * - DELETE /api/admin/documents/:id → remove a document from index
 * - POST /api/admin/test-chat       → test chat without logging
 */

export async function handleAdmin(request, env, url) {
  // Auth check
  const password = request.headers.get('X-Admin-Password');
  if (!password || password !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const path = url.pathname.replace('/api/admin/', '');
  const method = request.method;

  // Settings
  if (path === 'settings' && method === 'GET') {
    const systemPrompt = await env.SETTINGS.get('system_prompt');
    const overridesRaw = await env.SETTINGS.get('qa_overrides');
    return jsonResponse({
      system_prompt: systemPrompt || '',
      qa_overrides: overridesRaw ? JSON.parse(overridesRaw) : [],
    });
  }

  if (path === 'settings' && method === 'POST') {
    const body = await request.json();
    if (typeof body.system_prompt === 'string') {
      await env.SETTINGS.put('system_prompt', body.system_prompt);
    }
    if (Array.isArray(body.qa_overrides)) {
      await env.SETTINGS.put('qa_overrides', JSON.stringify(body.qa_overrides));
    }
    return jsonResponse({ success: true });
  }

  // Logs
  if (path === 'logs' && method === 'GET') {
    const list = await env.SETTINGS.list({ prefix: 'log:', limit: 100 });
    const logs = [];
    for (const key of list.keys) {
      const val = await env.SETTINGS.get(key.name);
      if (val) {
        try {
          logs.push({ id: key.name, ...JSON.parse(val) });
        } catch {}
      }
    }
    logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    return jsonResponse({ logs });
  }

  if (path.startsWith('logs/') && method === 'DELETE') {
    const id = decodeURIComponent(path.replace('logs/', ''));
    await env.SETTINGS.delete(id);
    return jsonResponse({ success: true });
  }

  // Documents
  if (path === 'documents' && method === 'GET') {
    const docsRaw = await env.SETTINGS.get('documents_index');
    return jsonResponse({
      documents: docsRaw ? JSON.parse(docsRaw) : [],
    });
  }

  if (path.startsWith('documents/') && method === 'DELETE') {
    const docId = decodeURIComponent(path.replace('documents/', ''));
    // Remove vectors with this doc_id
    // Vectorize doesn't support filter-delete yet, so we track vector IDs per doc
    const idMapRaw = await env.SETTINGS.get(`doc_vectors:${docId}`);
    if (idMapRaw) {
      const ids = JSON.parse(idMapRaw);
      // Vectorize batch delete (max 1000 per call)
      for (let i = 0; i < ids.length; i += 1000) {
        await env.VECTORIZE.deleteByIds(ids.slice(i, i + 1000));
      }
      await env.SETTINGS.delete(`doc_vectors:${docId}`);
    }
    // Remove from documents list
    const docsRaw = await env.SETTINGS.get('documents_index');
    if (docsRaw) {
      const docs = JSON.parse(docsRaw).filter((d) => d.id !== docId);
      await env.SETTINGS.put('documents_index', JSON.stringify(docs));
    }
    // Try to remove PDF from R2 if it exists
    try {
      await env.PDF_BUCKET.delete(`${docId}.pdf`);
    } catch {}
    return jsonResponse({ success: true });
  }

  // Test chat (no logging)
  if (path === 'test-chat' && method === 'POST') {
    const body = await request.json();
    // Forward to /api/chat logic but mark as test
    const { handleChat } = await import('./chat.js');
    const fakeRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ ...body, sessionId: 'admin-test' }),
    });
    return handleChat(fakeRequest, env);
  }

  return jsonResponse({ error: 'Unknown admin endpoint' }, 404);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
