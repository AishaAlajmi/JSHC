import { createClient } from '@supabase/supabase-js';

// Why: Service role key stays on server, bypasses RLS; never expose to browser
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = req.body ?? {};
      const email = String(body.email || '').trim();
      const payload = body.payload ?? {};
      if (!email) {
        res.status(400).json({ error: 'email is required' });
        return;
      }

      const { data, error } = await supabase
        .from('records')
        .insert([{ email, payload }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
      return;
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      res.status(200).json(data);
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('API /api/records error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

