# MirrorMENA

AI-powered MENA beauty and fashion experience using the **YouCam API**.

MirrorMENA combines two retail-oriented AI experiences in one bilingual web demo:

- **Skin Intelligence** — YouCam Skin Analysis v2.1 for HD wrinkle, pore, texture and acne analysis.
- **Virtual Style** — YouCam AI Clothes v3 for reference-image virtual try-on.

## Security architecture

The YouCam API key is **never shipped to the browser**. Browser uploads use short-lived pre-signed upload URLs obtained through the serverless API route. The server route reads the key only from the `YOUCAM_API_KEY` environment variable.

## Official YouCam endpoints used

### Skin Analysis v2.1
- `POST /s2s/v2.1/file/skin-analysis`
- `POST /s2s/v2.1/task/skin-analysis`
- `GET /s2s/v2.1/task/skin-analysis/{task_id}`

### AI Clothes v3
- `POST /s2s/v2.0/file/cloth-v3`
- `POST /s2s/v2.0/task/cloth-v3`
- `GET /s2s/v2.0/task/cloth-v3/{task_id}`

## Deploy on Vercel

1. Import this repository into Vercel.
2. Add an environment variable named `YOUCAM_API_KEY` in Project Settings → Environment Variables.
3. Paste the active YouCam API key as the value. Do not prefix it with `Bearer`.
4. Deploy.

No paid service is required for the hackathon demo when kept within available free allowances.

## Local development

Install the Vercel CLI, create `.env.local` from `.env.example`, add your key locally, then run `vercel dev`.

## Privacy and medical disclaimer

This project is a hackathon demonstration. Skin Analysis output is not medical diagnosis or medical advice. User images are sent to YouCam's upload and processing infrastructure only when the user explicitly starts an analysis or virtual try-on.

## License

MIT — see [LICENSE](LICENSE).
