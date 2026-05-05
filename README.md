# SplitStack

Shared expense management app.

## Requirements

- [Node.js](https://nodejs.org) (includes npm) — use **v22 LTS**
- [Flutter](https://flutter.dev) for the mobile app

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
├── mobile-app/       ← Flutter mobile client
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

The mobile app uses the same backend API and SQLite database as the website.
Start the backend first, then open a second terminal:

```bash
cd mobile-app
flutter pub get
flutter run
```

Defaults:

- Android emulator: `http://10.0.2.2:3001/api`
- iOS simulator: `http://127.0.0.1:3001/api`

For the fastest local demo, you can also choose Chrome when Flutter asks for a device:

```bash
flutter run -d chrome
```

For iOS Simulator, install full Xcode from the App Store first. For Android
Emulator, install Android Studio and the Android SDK.

For a physical phone, put the phone and laptop on the same Wi-Fi, find the
laptop IP, then pass it to Flutter:

```bash
ipconfig getifaddr en0
flutter run -d <device-id> --dart-define=API_BASE_URL=http://YOUR_IP:3001/api
```

The final demo flow should use real registered accounts:

1. Register a new user in the mobile app and choose an avatar.
2. Create a group and invite another teammate by email.
3. The invited teammate registers or logs in with that email.
4. They accept the invite from the Groups tab.
5. Add expenses, vote on large purchases, and refresh to see persisted balances.

---

## Quick Reference

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server (auto-restarts on file changes) |
| `npm run build` | Build for production |
| `npm run lint` | Check for code issues |
| `flutter run` | Start the mobile app |
| `flutter test` | Run mobile app tests |

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

## Demo Data

Fresh databases start empty so the team can demo real registration, invites, and
persisted group data. If you need disposable sample data for local development,
start the backend with:

```bash
SPLITSTACK_SEED_DEMO=true npm run dev
```

Do not use seeded accounts for the final walkthrough.

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
