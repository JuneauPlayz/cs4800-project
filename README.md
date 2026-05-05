# SplitStack

Shared expense management app.

## Requirements

- [Node.js](https://nodejs.org) (includes npm) — use **v22 LTS**

To check if you have it:
```bash
node --version
npm --version
```

If not installed:
```bash
brew install node
```

If you have Node but it's the wrong version, install nvm and switch:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# open a new terminal, then:
nvm install 22
nvm use 22
```

---

## Project Structure

```
cs4800-project/
├── website/
│   ├── frontend/     ← React + Vite app
│   └── backend/      ← Express + SQLite API
└── README.md
```

---

## Running the Backend

```bash
cd website/backend
npm install
npm run dev
```

You should see:
```
SplitStack API running at http://localhost:3001
```

> Verify it works: open http://localhost:3001/api/health in your browser.

### Gemini AI Assistant

The Gemini API key is read by the backend only, so it is not exposed in the website bundle or mobile app.

Add your key here:

```bash
website/backend/.env
```

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

Restart the backend after editing `.env`. If the key is blank or Gemini is unreachable, the assistant falls back to local SplitStack summaries.

---

## Running the Frontend

Open a **second terminal tab**, then:

```bash
cd website/frontend
npm install
npm run dev
```

Then open **http://localhost:5173/** in your browser.

> Both servers must be running at the same time for the app to work.

---

## Running the Mobile App

The Flutter mobile app calls the same backend API as the website.

```bash
cd mobile-app
flutter run
```

Defaults:

- Android emulator: `http://10.0.2.2:3001/api`
- iOS simulator: `http://127.0.0.1:3001/api`

You can override the API URL when running:

```bash
flutter run --dart-define=API_BASE_URL=http://YOUR_COMPUTER_IP:3001/api
```

---

## Quick Reference

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (auto-restarts on file changes) |
| `npm run build` | Build for production |
| `npm run lint` | Check for code issues |

---

## Troubleshooting

**`zsh: command not found: npm`** — Node is not installed. See Requirements above.

**`cd: no such file or directory`** — Make sure you're in the project root (`cs4800-project/`) before running `cd`.

**`Cannot reach backend`** — Make sure the backend is running on port 3001 before opening the frontend.

**Port already in use** — Another process is using the port. Run on a different port:
```bash
npx vite --port 3000        # frontend
PORT=3002 npm run dev       # backend
```

---

## Demo Accounts

You can sign in with one of the seeded accounts:

- `jordan@splitstack.app` / `demo123`
- `marcus@splitstack.app` / `demo123`
- `priya@splitstack.app` / `demo123`
- `sam@splitstack.app` / `demo123`

You can also register a new account. If that email was invited to a group before registration, the invite will appear after sign in.

---

## Included Features

- Real email/password registration and login
- Persistent user-specific sessions in the frontend
- Group creation, editing, and invite acceptance
- Real member-aware expenses with equal / percent / custom split methods
- Auto-created votes when an expense exceeds the group voting threshold
- Group-specific challenges with contributions from accepted members
- User-specific notifications and settings
- Gemini-backed AI assistant responses based on live app data
