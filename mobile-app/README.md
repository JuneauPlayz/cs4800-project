# SplitStack Mobile App

Flutter client for SplitStack. The app talks to the Express + SQLite API in
`website/backend`, so accounts, groups, invites, expenses, votes, balances, and
settings persist in the backend database.

## Prerequisites

- Flutter SDK
- Node.js 22 LTS
- Chrome for the fastest local demo
- Full Xcode for iOS Simulator
- Android Studio for Android Emulator

Check your setup:

```bash
flutter doctor
node --version
npm --version
```

## Run the Backend

Start the API first in one terminal:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/website/backend
npm install
npm run dev
```

The API should print:

```text
SplitStack API running at http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/api/health
```

## Run the Mobile App

Open a second terminal:

```bash
cd /Users/sarinakhara/Desktop/CS4800/cs4800-project/mobile-app
flutter pub get
flutter run
```

If Flutter asks for a device, choose Chrome for the quickest demo. You can also
run directly:

```bash
flutter run -d chrome
flutter run -d macos
flutter run -d ios
flutter run -d android
```

## Real Demo Flow

Do not use shared demo credentials for the final walkthrough. Each teammate can
register an account with their own email and password from the mobile app.

1. Person A registers and creates a group.
2. Person A enters Person B's email in the invite field.
3. Person B registers or logs in with that same email.
4. Person B opens the Groups tab and accepts the pending invite.
5. Either member adds expenses, submits large expenses for voting, votes, and
   refreshes to see balances update from the backend.

The app stores the session token locally with `shared_preferences`. The shared
data is stored by the backend in `website/backend/splitstack.db`.

## API URL Rules

The app chooses an API base URL automatically:

| Target | Default API URL |
| --- | --- |
| Chrome | `http://localhost:3001` |
| iOS Simulator | `http://127.0.0.1:3001` |
| Android Emulator | `http://10.0.2.2:3001` |
| macOS desktop | `http://127.0.0.1:3001` |

For a physical phone, both the phone and laptop must be on the same Wi-Fi. Find
the laptop IP address, then pass it to Flutter:

```bash
ipconfig getifaddr en0
flutter run -d <device-id> --dart-define=API_BASE_URL=http://YOUR_IP:3001
```

Example:

```bash
flutter run -d 00008110-001234 --dart-define=API_BASE_URL=http://192.168.1.25:3001
```

## iOS Setup

Install full Xcode from the App Store, open it once, then run:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
sudo xcodebuild -license accept
brew install cocoapods
flutter doctor
```

Run:

```bash
open -a Simulator
flutter run -d ios
```

## Android Setup

Install Android Studio, then install:

- Android SDK Platform
- Android SDK Command-line Tools
- Android Emulator

Then run:

```bash
flutter doctor --android-licenses
flutter doctor
flutter run -d android
```

## Useful Commands

```bash
flutter devices
flutter analyze
flutter test
flutter clean
flutter pub get
```

## Optional Demo Seed Data

Fresh databases start empty so the final demo can use real team accounts. If a
developer wants old sample data for local testing, start the backend with:

```bash
SPLITSTACK_SEED_DEMO=true npm run dev
```

Only use this on a disposable local database.
