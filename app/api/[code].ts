// app/api/[code].ts
// Zero-install Upstash Redis REST API for sharing schedules by 6-digit code.
// Requires Vercel env vars: KV_REST_API_URL, KV_REST_API_TOKEN

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

const KEY = (code: string) => `ds:share:${code}`;

// Minimal Redis REST helper
async function redis(command: (string | number)[]) {
  if (!BASE || !TOKEN) {
    return { error: 'KV env vars not configured' };
  }
  const res = await fetch(BASE as string, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command }),
  });
  try {
    const json = await res.json();
    return json;
  } catch {
    return { error: 'Invalid response from KV' };
  }
}

// GET /api/<code>  -> returns stored JSON payload
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = (params?.code || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid code' }), { status: 400 });
  }
  const r = await redis(['GET', KEY(code)]);
  if (!r || (r as any).error) {
    return new Response(JSON.stringify({ ok: false, error: (r as any)?.error || 'KV error' }), { status: 500 });
  }
  if ((r as any).result == null) {
    return new Response(JSON.stringify({ ok: false, error: 'Code not found or expired' }), { status: 404 });
  }
  try {
    const data = JSON.parse((r as any).result as string);
    return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Corrupt payload' }), { status: 500 });
  }
}

// PUT /api/<code>  body: { ...payload }  -> stores JSON for 24h
export async function PUT(req: Request, { params }: { params: { code: string } }) {
  const code = (params?.code || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid code' }), { status: 400 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Missing or invalid JSON body' }), { status: 400 });
  }
  const value = JSON.stringify(body);
  const r = await redis(['SET', KEY(code), value, 'EX', 60 * 60 * 24]); // 24h TTL
  if (!r || (r as any).error) {
    return new Response(JSON.stringify({ ok: false, error: (r as any)?.error || 'KV error' }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

// DELETE /api/<code> -> invalidates the code
export async function DELETE(_req: Request, { params }: { params: { code: string } }) {
  const code = (params?.code || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid code' }), { status: 400 });
  }
  const r = await redis(['DEL', KEY(code)]);
  if (!r || (r as any).error) {
    return new Response(JSON.stringify({ ok: false, error: (r as any)?.error || 'KV error' }), { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
