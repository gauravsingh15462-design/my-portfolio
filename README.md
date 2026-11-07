# Gaurav Singh — Portfolio

A React + Vite portfolio frontend backed by a FastAPI profile API. Portfolio content lives in `backend/data/profile.json`; the website and generated CV use that same data.

## Requirements

- Visual Studio Code
- Node.js LTS and npm
- Python 3.10 or later
- A modern browser

Git is recommended for version history. Install these tools from their official websites, then open this project folder in VS Code.

## Run locally on Windows

Open two terminals in VS Code.

### Terminal 1: FastAPI backend

From the project root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

The API runs at `http://localhost:8000`. FastAPI's interactive endpoint documentation is at `http://localhost:8000/docs`.

### Terminal 2: React frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

Open the local address Vite prints (usually `http://localhost:5173`). Vite proxies `/api` requests to FastAPI.

## Updating portfolio content

Edit `backend/data/profile.json` to update the profile, education, skills, projects, and public links. Restarting the backend is not required when the file changes. The downloadable CV at `/api/cv` is generated from the same data each time it is requested.

The phone number is intentionally not displayed. The public profile and CV use email and social-link placeholders; the contact form sends through the configured backend without displaying its recipient address.

## Contact form email setup

The contact form sends messages through the Resend HTTPS API (works on Render's free tier, which blocks SMTP) to the address in `backend/data/profile.json`. To enable delivery:

1. Create a free account at resend.com using the same email as in `profile.json`.
2. Create an API key.
3. Copy `backend/.env.example` to `backend/.env` and put the key in `RESEND_API_KEY`. Do not share or commit `backend/.env`.
4. On Render, add `RESEND_API_KEY` as an environment variable on the backend service.
5. Restart FastAPI. The contact form reports a setup/delivery error if email is not configured.

The API limits each client address to three contact submissions per ten minutes in one running backend process. For a public multi-instance deployment, add a shared rate limiter and configure trusted proxy handling at the hosting layer.

## Portfolio phases, Q&A, and motion

- Phase 1 has a responsive hero, a role-flipping notebook card, the two supplied profile portraits in `frontend/public/images/`, and a hanging pull-cord day/night theme toggle. The theme starts from the visitor’s system preference; changes last for the current page session only. Green and brass palette tokens live in `frontend/src/styles.css`. The animated role card respects `prefers-reduced-motion`.
- Phase 2 shows six individually labeled arched project doors. Opening a door animates into a routed project room at `/project/:id`; project details use the supplied data, with unconfirmed roles and links clearly left as placeholders. Direct links, browser Back, keyboard activation, and reduced-motion transitions are supported.
- Phase 3 shows education, learning, and hackathon milestones from `backend/data/profile.json`. Years are omitted when they have not been confirmed.
- Phase 4 retains the contact form, CV download, footer, and section reveal transitions. The public profile endpoint and generated CV use contact/link placeholders, while the message form continues to deliver through the configured backend address.
- The remaining portfolio includes animated CSS scenes and a qualitative learning-stage chart. Chart stages come from the self-reported portfolio and are not proficiency test scores. Motion respects `prefers-reduced-motion`.
- The Cormorant Garamond display font is served locally; its SIL Open Font License is included at `frontend/public/fonts/OFL.txt`.
- The “Ask about me” chat answers only from the public profile data. It does not call an external AI service, so no AI key or visitor chat history is sent to a provider. Unknown or unrelated questions get a clear out-of-scope response.
- Update Smart India Hackathon details in `backend/data/profile.json` if you want to add the year, team, problem statement, or result; only participation is currently stated.

## Fill in before publishing

- Replace `frontend/public/images/portrait-seated.jpeg` or `frontend/public/images/portrait-standing.jpeg` if you want to use different profile photos.
- Replace the visible email placeholder (`your.email@example.com`) in `frontend/src/App.jsx` before publishing. The actual contact-form recipient remains the private address in `backend/data/profile.json`.
- Confirm project implementation status and add repository or live-demo URLs before publishing claims about those features.
- Add milestone years only after confirming them in `backend/data/profile.json` (`journey`).
- Add the LinkedIn/social URL in the footer/contact design when you want it public; the current public profile and CV intentionally omit the existing URL.
