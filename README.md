# SplitStack

SplitStack is a shared-expenses app with a React frontend, an Express + SQLite backend, AI assistant responses, group voting, challenges, settlements, and mobile-only receipt scanning.

## Requirements

- Node.js 22
- npm

Check your versions:

```bash
node --version
npm --version
```

## Project Structure

```text
cs4800-project/
├── website/
│   ├── frontend/
│   └── backend/
└── README.md
```

## First-Time Setup

Install dependencies in both apps:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/backend
npm install

cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/frontend
npm install
```

## Run The App

You need two terminals open at the same time.

### Terminal 1: backend

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/backend
npm run dev
```

Expected result:

```text
SplitStack API running at http://localhost:3001
```

Quick backend health check:

```bash
open http://localhost:3001/api/health
```

### Terminal 2: frontend

For normal desktop testing:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/frontend
npm run dev
```

For phone testing on the same Wi-Fi:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/frontend
npm run dev -- --host
```

Expected result:

```text
Local:   http://localhost:5173/
Network: http://<your-local-ip>:5173/
```

Open the frontend at:

- Desktop: `http://localhost:5173/`
- Phone: the `Network` URL shown in the frontend terminal

## Demo Accounts

- `jordan@splitstack.app` / `demo123`
- `marcus@splitstack.app` / `demo123`
- `priya@splitstack.app` / `demo123`
- `sam@splitstack.app` / `demo123`

## Mobile Testing

Receipt scanning is intentionally mobile-only.

To test it:

1. Start backend with `npm run dev`.
2. Start frontend with `npm run dev -- --host`.
3. On your phone, open the `Network` URL shown by Vite.
4. Log in with one of the demo accounts.
5. Go to `Add Expense`.
6. In the receipt section, use either:
   - `Upload from library`
   - `Take a new photo`

The scanner only auto-fills:

- merchant
- date
- total amount

The user should still type:

- description
- category

## Useful Commands

Backend:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/backend
npm run dev
npm run build
npm run lint
```

Frontend:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/frontend
npm run dev
npm run dev -- --host
npm run build
npm run lint
```

## Troubleshooting

### Red error banner at the top of the app

If you changed backend schema or pulled new code, fully restart the backend:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/backend
npm run dev
```

The backend applies SQLite migrations on startup.

### Frontend opens but data does not load

Make sure the backend is running on port `3001`.

### Phone cannot reach the app

- Make sure your phone and computer are on the same Wi-Fi.
- Use the `Network` URL from `npm run dev -- --host`.
- Keep both terminals running.

### `zsh: command not found: npm`

Install Node.js first.

## Notes

- The app uses a local SQLite database at `website/backend/splitstack.db`.
- Frontend and backend must both be running for the app to work.
- `npm audit fix` is optional cleanup and is not required to start the app.
