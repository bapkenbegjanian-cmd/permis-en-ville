// Fonction Supabase « bright-endpoint » de Cabine.
// Elle garde la clé FASHN côté serveur, vérifie que la personne est connectée,
// compte ses essais (3 gratuits) et lit la photo d'un habit à partir d'un lien.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const FREE = 3;
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const fashnKey = Deno.env.get('FASHN_KEY') ?? Deno.env.get('KEY') ?? Deno.env.get('key');

async function quota(uid: string) {
  const { count } = await admin.from('essais').select('id', { count: 'exact', head: true }).eq('user_id', uid);
  const { data: ab } = await admin.from('abonnes').select('fin').eq('user_id', uid).maybeSingle();
  const pro = !!(ab && (!ab.fin || new Date(ab.fin) > new Date()));
  return { used: count ?? 0, free: FREE, pro };
}

// Lit la photo d'aperçu (og:image) d'une page produit, comme le font les messageries pour les liens partagés
async function preview(link: string) {
  let u: URL;
  try { u = new URL(link); } catch { return { error: 'lien invalide' }; }
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(u.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname)) return { error: 'lien refusé' };
  const c = new AbortController(), to = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(u, { signal: c.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CabineBot/1.0; aperçu de lien)', 'Accept-Language': 'fr,en' } });
    if (!r.ok) return { error: 'site inaccessible (' + r.status + ')' };
    const html = (await r.text()).slice(0, 600000);
    const meta = (p: string) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)`, 'i')) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, 'i')) || [])[1];
    const img = meta('og:image') || meta('og:image:url') || meta('twitter:image');
    if (!img) return { error: 'pas de photo trouvée sur cette page' };
    return { image: new URL(img.replace(/&amp;/g, '&'), u).href, title: (meta('og:title') || '').replace(/&amp;/g, '&').slice(0, 120) };
  } catch { return { error: 'le site ne répond pas' }; } finally { clearTimeout(to); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  const user = data?.user;
  if (!user) return json({ error: 'connexion' }, 401);
  const { action, body, id, link } = await req.json().catch(() => ({}));

  if (action === 'quota') return json(await quota(user.id));
  if (action === 'preview') return json(await preview(String(link || '')));

  const auth = { Authorization: `Bearer ${fashnKey}`, 'Content-Type': 'application/json' };
  if (action === 'run') {
    const q = await quota(user.id);
    if (!q.pro && q.used >= FREE) return json({ error: 'quota', ...q }, 402);
    const r = await fetch('https://api.fashn.ai/v1/run', { method: 'POST', headers: auth, body: JSON.stringify(body) });
    const out = await r.json().catch(() => ({}));
    if (out.id) await admin.from('essais').insert({ user_id: user.id, prediction: out.id });
    return json(out, r.status);
  }
  if (action === 'status' && /^[\w-]+$/.test(id || '')) {
    const r = await fetch(`https://api.fashn.ai/v1/status/${id}`, { headers: auth });
    return json(await r.json().catch(() => ({})), r.status);
  }
  return json({ error: 'demande invalide' }, 400);
});
