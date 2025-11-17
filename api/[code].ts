// api/[code].ts
// Serverless function for sharing schedules by 6-digit code.
// Uses Upstash Redis REST API via KV_REST_API_URL and KV_REST_API_TOKEN.

import type { VercelRequest, VercelResponse } from '@vercel/node';

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
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ command }),
  });

  if (!res.ok) {
    return { error: `KV HTTP ${res.status}` };
  }

  return res.json() as Promise<{ result?: unknown; error?: string }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const codeRaw = req.query.code;
  const code = typeof codeRaw === 'string' ? codeRaw.trim() : '';

  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ ok: false, error: 'Invalid code' });
    return;
  }

  const key = KEY(code);

  try {
    if (req.method === 'GET') {
      const r = await redis(['GET', key]);
      if (!r || (r as any).error) {
        res
          .status(500)
          .json({ ok: false, error: (r as any)?.error || 'KV error' });
        return;
      }
      if ((r as any).result == null) {
        res
          .status(404)
          .json({ ok: false, error: 'Code not found or expired' });
        return;
      }

      try {
        const data = JSON.parse((r as any).result as string);
        res.status(200).json({ ok: true, data });
        return;
      } catch {
        res.status(500).json({ ok: false, error: 'Corrupt payload' });
        return;
      }
    }

    if (req.method === 'PUT') {
      const body = req.body || {};

      if (!body || typeof body !== 'object') {
        res
          .status(400)
          .json({ ok: false, error: 'Body must be JSON object' });
        return;
      }

      const payload = JSON.stringify(body);

      // store for 3 days (60 * 60 * 24 * 3)
      const r = await redis(['SET', key, payload, 'EX', 60 * 60 * 24 * 3]);
      if (!r || (r as any).error) {
        res
          .status(500)
          .json({ ok: false, error: (r as any)?.error || 'KV error' });
        return;
      }

      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const r = await redis(['DEL', key]);
      if (!r || (r as any).error) {
        res
          .status(500)
          .json({ ok: false, error: (r as any)?.error || 'KV error' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET,PUT,DELETE');
    res.status(405).end('Method Not Allowed');
  } catch (err) {
    console.error('KV handler error', err);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
}
