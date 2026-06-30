# Virtual Tennis Coach

A local Next.js prototype for tennis technique analysis.

Flow: upload a short swing video -> extract pose/motion signals in the browser -> send the video and pose summary to OpenRouter -> receive a tennis-coach diagnosis with detected stroke, confidence, issues, cues, and drills.

The app also includes a visual metrics guide at `/metrics` explaining pose visibility, sampled frames, stance ratio, balance drift, and follow-through height.

## Setup

```bash
cp .env.local.example .env.local
```

Add your OpenRouter key:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=google/gemini-2.5-pro
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- The app is real-only: without `OPENROUTER_API_KEY`, analysis returns a blocking error.
- Uploads are validated to MP4, MOV, or WebM under 25MB.
- MediaPipe runs in the browser. The OpenRouter key is only used by the server route.
- For best results, use a 5-30 second clip with the player's full body visible.

## Scripts

```bash
npm run lint
npm run test
npm run build
```
