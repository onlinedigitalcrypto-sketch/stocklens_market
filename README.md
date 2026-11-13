# StockLens: put it online in about 5 minutes (free)

1. Create a free account at github.com, press **New repository**, then **uploading an existing file** and upload `index.html` and the `api` folder (keep `api/stock.js` inside the folder). Commit.
2. Go to vercel.com, sign in with GitHub, press **Add New → Project**, pick that repository and press **Deploy** (no settings needed).
3. Vercel gives you a link such as `https://yourname-stocklens.vercel.app`. Share it with your friend.
   Direct links work too: `https://yourname-stocklens.vercel.app/?s=TCS.NS`

Symbols: NSE `TCS.NS`, BSE `TCS.BO`, US `AAPL`.

Notes
- Prices, fundamentals and headlines come from Yahoo Finance and Google News public endpoints (no key). They are unofficial, so fundamentals can occasionally be blank; fill them under *Advanced*.
- Opening `index.html` directly from your phone/PC will not fetch live data: it needs the `api` function running on Vercel.
