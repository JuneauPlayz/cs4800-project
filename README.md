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
