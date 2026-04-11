/**
 * Chat handler — RAG pipeline with recency boost
 * Strategy:
 * 1. Embed user question (Google embeddings)
 * 2. Search Vectorize (multilingual — works across all 11 languages)
 * 3. Rerank with recency boost (newer catalogs win on ties)
 * 4. Check Q&A overrides (manual answers from admin)
 * 5. Send context + question to Gemini Flash
 * 6. Log conversation
 */

import { embed, generateAnswer } from './gemini.js';
import { LANGUAGE_NAMES, SYSTEM_PROMPT_TEMPLATE } from './prompts.js';

export async function handleChat(request, env) {
  const body = await request.json();
  const { message, language = 'hr', sessionId = null } = body;

  if (!message || typeof message !== 'string') {
    return jsonResponse({ error: 'Missing message' }, 400);
  }

  // 1. Check Q&A overrides first (admin-set manual answers)
  const overrides = await getOverrides(env);
  const override = findOverrideMatch(message, overrides, language);
  if (override) {
    await logChat(env, { message, answer: override.answer, language, source: 'override', sessionId });
    return jsonResponse({
      answer: override.answer,
      sources: [],
      source_type: 'override',
    });
  }

  // 2. Embed the user's question
  const queryVector = await embed(message, env.GOOGLE_API_KEY);

  // 3. Search Vectorize — get more than we need so we can rerank
  const searchResults = await env.VECTORIZE.query(queryVector, {
    topK: 15,
    returnMetadata: 'all',
  });

  // 4. Rerank with recency boost
  const ranked = rerankWithRecency(searchResults.matches || []);
  const topMatches = ranked.slice(0, 6);

  // 5. Build context for the LLM
  const context = buildContext(topMatches);

  // 6. Get system prompt (admin can customize this)
  const customPrompt = await env.SETTINGS.get('system_prompt');
  const systemPrompt = (customPrompt || SYSTEM_PROMPT_TEMPLATE)
    .replace('{LANGUAGE}', LANGUAGE_NAMES[language] || 'Croatian')
    .replace('{LANGUAGE_CODE}', language);

  // 7. Generate answer
  const answer = await generateAnswer({
    systemPrompt,
    context,
    question: message,
    apiKey: env.GOOGLE_API_KEY,
  });

  // 8. Don't return sources (user doesn't want them in widget)
  // Bot will mention sources in the text itself if needed

  // 9. Log conversation for admin review
  await logChat(env, {
    message,
    answer,
    language,
    source: 'rag',
    sessionId,
    matches: topMatches.length,
  });

  return jsonResponse({
    answer,
    sources: [],
    source_type: 'rag',
  });
}

/**
 * Recency boost: when scores are close, prefer newer year.
 * Boost is small (0.03 per year newer than 2020) so it only matters on near-ties.
 */
function rerankWithRecency(matches) {
  return matches
    .map((m) => {
      const year = parseInt(m.metadata?.year) || 0;
      const recencyBoost = year > 2020 ? (year - 2020) * 0.015 : 0;
      return {
        ...m,
        boostedScore: m.score + recencyBoost,
      };
    })
    .sort((a, b) => b.boostedScore - a.boostedScore);
}

function buildContext(matches) {
  if (matches.length === 0) {
    return 'NO_RELEVANT_CONTEXT_FOUND';
  }
  return matches
    .map((m, i) => {
      const md = m.metadata || {};
      const source = md.source_type === 'pdf'
        ? `[PDF Catalog: ${md.catalog_name || 'Unknown'}, year ${md.year || '?'}, page ${md.page || '?'}]`
        : `[Website section: ${md.page_title || md.url || 'Unknown'}]`;
      return `--- SOURCE ${i + 1} ${source} ---\n${md.text || ''}`;
    })
    .join('\n\n');
}

async function getOverrides(env) {
  const raw = await env.SETTINGS.get('qa_overrides');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function findOverrideMatch(message, overrides, language) {
  const lower = message.toLowerCase();
  for (const o of overrides) {
    const triggers = (o.triggers || []).map((t) => t.toLowerCase());
    if (triggers.some((t) => lower.includes(t))) {
      // Use language-specific answer if available, fallback to default
      const answer = o.answers?.[language] || o.answers?.hr || o.answer;
      if (answer) return { answer };
    }
  }
  return null;
}

async function logChat(env, entry) {
  try {
    const logKey = `log:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await env.SETTINGS.put(
      logKey,
      JSON.stringify({ ...entry, timestamp: new Date().toISOString() }),
      { expirationTtl: 60 * 60 * 24 * 30 } // keep 30 days
    );
  } catch (e) {
    console.error('Log failed:', e);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
