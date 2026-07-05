interface Env {
  RM_CLIENT_ID: string;
  RM_CLIENT_SECRET: string;
  TEAM_KEY?: string;
  ALLOWED_ORIGIN: string;
  AUTH_URL: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

// Cache the token across requests within this isolate so a pit box full of
// devices doesn't hammer the identity server (tokens live 300s).
let cached: { token: TokenResponse; fetchedAt: number } | null = null;

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'x-team-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (url.pathname !== '/api/token' || request.method !== 'GET') {
      return new Response('Not found', { status: 404, headers: cors });
    }
    if (env.TEAM_KEY && request.headers.get('x-team-key') !== env.TEAM_KEY) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }
    if (!env.RM_CLIENT_ID || !env.RM_CLIENT_SECRET) {
      return new Response('Broker not configured (missing RM_CLIENT_ID / RM_CLIENT_SECRET secrets)', {
        status: 503,
        headers: cors,
      });
    }

    const now = Date.now();
    if (cached && now - cached.fetchedAt < (cached.token.expires_in - 60) * 1000) {
      const remaining = cached.token.expires_in - Math.floor((now - cached.fetchedAt) / 1000);
      return json({ access_token: cached.token.access_token, expires_in: remaining }, cors);
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.RM_CLIENT_ID,
      client_secret: env.RM_CLIENT_SECRET,
    });
    const res = await fetch(env.AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      return new Response(`Identity server error: HTTP ${res.status}`, { status: 502, headers: cors });
    }
    const token = (await res.json()) as TokenResponse;
    cached = { token, fetchedAt: now };
    return json({ access_token: token.access_token, expires_in: token.expires_in }, cors);
  },
};

function json(data: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
  });
}
