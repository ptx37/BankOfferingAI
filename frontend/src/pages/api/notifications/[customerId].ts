import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.API_URL ?? 'http://api:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { customerId } = req.query as { customerId: string };
  const auth = req.headers.authorization ?? '';

  // PATCH /api/notifications/{id} → PATCH /notifications/{id}/read on FastAPI
  const upstream =
    req.method === 'PATCH'
      ? `${API_URL}/notifications/${customerId}/read`
      : `${API_URL}/notifications/${customerId}`;

  try {
    const response = await fetch(upstream, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch {
    return res.status(503).json({ error: 'Notification service unavailable' });
  }
}
