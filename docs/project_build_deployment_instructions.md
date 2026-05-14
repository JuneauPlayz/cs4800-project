# SplitStack Build and Deployment Instructions

Version: 1.0  
Date: May 2026  
Project: SplitStack shared expense management app

## 1. Prerequisites

Install the following tools:

- Node.js 22 LTS, which includes npm.
- Flutter SDK.
- Chrome for the fastest Flutter web demo.
- Xcode for iOS Simulator, if running iOS.
- Android Studio and Android SDK, if running Android Emulator.

Check versions:

```bash
node --version
npm --version
flutter doctor
```

## 2. Repository Structure

```text
cs4800-project/
  website/backend    Express + SQLite API
  website/frontend   React + Vite web client
  mobile-app         Flutter mobile/web client
  docs               Final submission documentation
  planning files     Supporting planning/prototype artifacts
```

## 3. Backend Setup

From the project root:

```bash
cd website/backend
npm install
```

Optional environment file:

```bash
cp .env.example .env
```

Useful backend environment variables:

```env
PORT=3001
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
SPLITSTACK_SEED_DEMO=true
JSON_BODY_LIMIT=20mb
RECEIPT_UPLOAD_BODY_LIMIT=20mb
```

The Gemini key is optional. If it is missing, the assistant returns local SplitStack summaries instead of failing.

## 4. Run Backend for Development

```bash
cd website/backend
npm run dev
```

Expected output:

```text
SplitStack API running at http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/api/health
```

## 5. Backend Production-Style Start

```bash
cd website/backend
npm run start
```

The backend has no transpilation step. The `npm run build` command exists as a no-op confirmation:

```bash
npm run build
```

## 6. Frontend Setup

Open a second terminal:

```bash
cd website/frontend
npm install
```

## 7. Run Frontend for Development

```bash
cd website/frontend
npm run dev
```

Open:

```text
http://localhost:5173/
```

The backend and frontend must run at the same time.

## 8. Build Frontend

```bash
cd website/frontend
npm run build
```

Preview a production build locally:

```bash
cd website/frontend
npm run preview
```

## 9. Mobile App Setup

```bash
cd mobile-app
flutter pub get
```

## 10. Run Mobile App

Start the backend first, then:

```bash
cd mobile-app
flutter run
```

Fastest local demo:

```bash
flutter run -d chrome
```

Other examples:

```bash
flutter run -d ios
flutter run -d android
flutter run -d macos
```

## 11. Mobile API Base URL Rules

| Target | Default API URL |
| --- | --- |
| Chrome | `http://localhost:3001` |
| iOS Simulator | `http://127.0.0.1:3001` |
| Android Emulator | `http://10.0.2.2:3001` |
| macOS desktop | `http://127.0.0.1:3001` |

For a physical phone, put the phone and laptop on the same Wi-Fi and pass the laptop IP:

```bash
ipconfig getifaddr en0
flutter run -d <device-id> --dart-define=API_BASE_URL=http://YOUR_IP:3001
```

## 12. Verification Commands

Run backend lint:

```bash
cd website/backend
npm run lint
```

Run frontend lint and build:

```bash
cd website/frontend
npm run lint
npm run build
```

Run mobile tests and analysis:

```bash
cd mobile-app
flutter test
flutter analyze
```

## 13. Demo Flow

1. Start backend.
2. Start web frontend or Flutter app.
3. Register a new user.
4. Create a group and invite another email.
5. Register or log in as the invited email.
6. Accept the invite.
7. Add an expense below the voting threshold.
8. Add an expense above the voting threshold.
9. Approve or decline the vote from group members.
10. View dashboard balances and analytics.
11. Record a settlement payment.
12. Create a challenge and add a contribution.
13. Ask the AI assistant a question about balances or budget.

## 14. Data Storage

The backend creates and uses a local SQLite database:

```text
website/backend/splitstack.db
```

Receipt uploads are stored under:

```text
website/backend/uploads/receipts
```

Fresh databases start empty unless demo seeding is enabled:

```bash
SPLITSTACK_SEED_DEMO=true npm run dev
```

## 15. Troubleshooting

| Issue | Fix |
| --- | --- |
| `npm` command missing | Install Node.js 22 LTS. |
| Backend port in use | Run backend with `PORT=3002 npm run dev`. |
| Frontend cannot reach backend | Confirm backend is running at `http://localhost:3001`. |
| Flutter cannot reach backend on Android Emulator | Use `http://10.0.2.2:3001` or pass `API_BASE_URL`. |
| Gemini assistant does not answer externally | Add `GEMINI_API_KEY` or rely on local fallback. |
| Receipt too large | Retake/compress image or use mobile compression flow. |
