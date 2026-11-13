// Vercel serverless function: GET /api/stock?symbol=TCS.NS
// Pulls 2 years of daily prices, key fundamentals and recent headlines. No API key needed.
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; StockLens/1.0)' };
const r2 = x => (x == null ? null : Math.round(x * 100) / 100);
const raw = o => (o && typeof o.raw === 'number' ? o.raw : null);
const pct = x => (x == null ? null : x * 100);
const dec = t => t.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

async function fundamentals(s, out) {
  try {
    const a = await fetch('https://fc.yahoo.com', { headers: UA, redirect: 'manual' });
    const ck = (a.headers.getSetCookie ? a.headers.getSetCookie() : [a.headers.get('set-cookie') || '']).map(x => x.split(';')[0]).join('; ');
    const h = { ...UA, Cookie: ck };
    const crumb = await (await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: h })).text();
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(s)}?modules=financialData,defaultKeyStatistics,summaryDetail&crumb=${encodeURIComponent(crumb)}`;
    const m = (await (await fetch(url, { headers: h })).json()).quoteSummary.result[0];
    const fd = m.financialData || {}, sd = m.summaryDetail || {}, ks = m.defaultKeyStatistics || {};
    const de = raw(fd.debtToEquity);
    const f = { pe: raw(sd.trailingPE) ?? raw(sd.forwardPE), roe: pct(raw(fd.returnOnEquity)), de: de == null ? null : de / 100,
      rg: pct(raw(fd.revenueGrowth)), pg: pct(raw(fd.earningsGrowth)), pm: pct(raw(fd.profitMargins)), ph: pct(raw(ks.heldPercentInsiders)) };
    Object.keys(f).forEach(k => { if (f[k] == null || !isFinite(f[k])) delete f[k]; else f[k] = r2(f[k]); });
    out.fund = f;
  } catch (e) { /* fundamentals are optional */ }
}

async function news(out) {
  try {
    const q = encodeURIComponent(out.name.replace(/\b(Limited|Ltd\.?|Inc\.?|Corporation|Corp\.?)\b/gi, '').trim() + ' share');
    const xml = await (await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`, { headers: UA })).text();
    out.news = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)].slice(0, 12).map(m => dec(m[1]));
  } catch (e) { /* news is optional */ }
}

module.exports = async (req, res) => {
  const s = String(req.query.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-^=&]{1,20}$/.test(s)) return res.status(400).json({ error: 'Invalid symbol.' });
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=2y&interval=1d`, { headers: UA });
    const j = await r.json();
    const c = j.chart && j.chart.result && j.chart.result[0];
    if (!c || !c.timestamp) return res.status(404).json({ error: 'Symbol not found. NSE stocks end in .NS (TCS.NS), BSE in .BO.' });
    const q = c.indicators.quote[0], rows = [];
    c.timestamp.forEach((t, i) => {
      if (q.close[i] == null) return;
      rows.push({ d: new Date(t * 1000).toISOString().slice(0, 10), o: r2(q.open[i] ?? q.close[i]), h: r2(q.high[i] ?? q.close[i]), l: r2(q.low[i] ?? q.close[i]), c: r2(q.close[i]), v: q.volume[i] || 0 });
    });
    const out = { symbol: s, name: c.meta.longName || c.meta.shortName || s, currency: c.meta.currency, rows, fund: {}, news: [] };
    await Promise.all([fundamentals(s, out), news(out)]);
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'Could not fetch data right now. Please try again in a minute.' });
  }
};
