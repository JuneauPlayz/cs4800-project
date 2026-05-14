# SplitStack Build and Deployment Instructions

Version: 1.0  
Date: May 12, 2026

## Prerequisites

- Node.js 22 LTS.
- npm, included with Node.js.
- Flutter SDK for the mobile app.
- Chrome for the quickest Flutter web/mobile demo.
- Xcode for iOS Simulator.
- Android Studio and Android SDK for Android Emulator.

## Backend Setup

From the project root:

```bash
cd website/backend
npm install
npm run dev
```

Expected backend URL:

```text
http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/api/health
```

Expected health response includes:

```json
{
  "ok": true,
  "service": "SplitStack API",
  "database": "sqlite"
}
```

## Backend Environment Variables

Create `website/backend/.env` when AI assistant calls should use Gemini:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
PORT=3001
```

If `GEMINI_API_KEY` is omitted, the backend returns local SplitStack assistant summaries.

## Web Frontend Setup

Open a second terminal:

```bash
cd website/frontend
npm install
npm run dev
```

Expected frontend URL:

```text
http://localhost:5173
```

The frontend expects the backend to be running at `http://localhost:3001`.

## Production Build Checks

Backend:

```bash
cd website/backend
npm run lint
```

Frontend:

```bash
cd website/frontend
npm run lint
npm run build
```

On Windows PowerShell, if script execution blocks `npm`, use:

```powershell
npm.cmd run lint
npm.cmd run build
```

## Mobile App Setup

Start the backend first, then open another terminal:

```bash
cd mobile-app
flutter pub get
flutter run
```

For the quickest local demo, choose Chrome when Flutter asks for a device:

```bash
flutter run -d chrome
```

Other common targets:

```bash
flutter run -d ios
flutter run -d android
flutter run -d macos
```

## Mobile API Base URLs

| Target | Default API URL |
| --- | --- |
| Chrome | `http://localhost:3001` |
| iOS Simulator | `http://127.0.0.1:3001` |
| Android Emulator | `http://10.0.2.2:3001` |
| macOS desktop | `http://127.0.0.1:3001` |

For a physical phone, put the phone and laptop on the same Wi-Fi, find the laptop IP, then pass it to Flutter:

```bash
flutter run -d <device-id> --dart-define=API_BASE_URL=http://YOUR_IP:3001
```

## Demo Deployment Flow

1. Start the backend with `npm run dev`.
2. Start the web frontend with `npm run dev`.
3. Optionally start the mobile app with `flutter run -d chrome`.
4. Register a new account.
5. Create a group and invite another account by email.
6. Log in as the invited account and accept the invite.
7. Add normal and above-threshold expenses.
8. Approve or decline the new vote.
9. Record a settlement payment.
10. Create a challenge and add contribution progress.
11. Upload a receipt image.
12. Set a monthly budget and review analytics.
13. Ask the assistant about balances, spending, or budget recommendations.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| `Cannot reach backend` | Confirm the backend is running on port 3001. |
| Frontend opens but API calls fail | Check the backend terminal and browser console. |
| Port already in use | Run the backend with `PORT=3002 npm run dev` and update client configuration if needed. |
| PowerShell blocks npm | Use `npm.cmd` commands or adjust execution policy for your shell. |
| Flutter cannot see backend on Android Emulator | Use `http://10.0.2.2:3001` or pass `API_BASE_URL`. |
| Gemini assistant does not call API | Add `GEMINI_API_KEY` to `website/backend/.env` and restart backend. |
