/**
 * ST Arc Chatbot - Cloudflare Worker
 * Handles: chat queries, admin operations, indexing
 */

import { handleChat } from './chat.js';
import { handleAdmin } from './admin.js';
import { handleIngest } from './ingest.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin, env),
      });
    }

    try {
      let response;

      // Route the request
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        response = await handleChat(request, env);
      } else if (url.pathname.startsWith('/api/admin/')) {
        response = await handleAdmin(request, env, url);
      } else if (url.pathname === '/api/ingest' && request.method === 'POST') {
        response = await handleIngest(request, env);
      } else if (url.pathname === '/' || url.pathname === '/health') {
        response = new Response(
          JSON.stringify({ status: 'ok', service: 'st-arc-chatbot' }),
          { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      } else {
        response = new Response('Not found', { status: 404 });
      }

      // Add CORS headers to response
      const newHeaders = new Headers(response.headers);
      const cors = corsHeaders(origin, env);
      for (const [k, v] of Object.entries(cors)) {
        newHeaders.set(k, v);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        JSON.stringify({ error: err.message || 'Internal error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin, env) },
        }
      );
    }
  },
};

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    'Access-Control-Max-Age': '86400',
  };
}
