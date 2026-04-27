# DocDecoder™

> Understand any document before it costs you money. 💰

## Deploy to Vercel in 3 steps

### 1. Push to GitHub
Create a new GitHub repo and push this folder to it.

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Vercel auto-detects Next.js — no config needed

### 3. Add your API key
In Vercel → Project Settings → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...your key...` |

Click **Deploy**. Done.

---

## Run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project structure

```
docdecoder/
├── pages/
│   ├── _app.js          # Next.js app wrapper
│   ├── index.js         # Main app (full DocDecoder UI)
│   └── api/
│       └── analyze.js   # Server-side Anthropic API call
├── styles/
│   └── globals.css
├── .env.example         # Copy to .env.local and add your key
├── next.config.js
├── package.json
└── vercel.json
```

## How the API key works

The Anthropic API key is stored as a **server-side environment variable**. It never touches the browser. All document analysis goes through `/api/analyze` — a Next.js API route that runs on Vercel's serverless functions.
