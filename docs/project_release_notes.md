# SplitStack Release Notes

## Version 1.0.0 - Final Project Submission

Prepared: May 12, 2026  
Release target: `main` at commit `6f1a3e2`  
Repository: https://github.com/JuneauPlayz/cs4800-project

These notes summarize the current SplitStack project state. The repository does not currently define git release tags, so this release is based on the latest `main` branch.

## Overview

SplitStack is a shared expense management app with a React/Vite web client, an Express/SQLite API, and a Flutter mobile client. This release turns the project into an end-to-end demoable product for shared expenses, group budgeting, voting, settlements, receipt capture, analytics, and AI-assisted financial coaching.

## Highlights

- Full shared-expense workflow from registration through group creation, invites, expense logging, approvals, balance tracking, and settlements.
- Cross-platform client support through the website and Flutter mobile app.
- Persistent backend data for users, groups, invites, expenses, votes, settings, notifications, challenges, budgets, and settlements.
- Receipt upload and OCR-assisted receipt entry for faster expense capture.
- Personal budget tracking with monthly and category-level budget context.
- Gemini-backed AI assistant with local fallback responses and confirmation-required account actions.

## New Features

### Accounts and Profiles

- Added real email/password registration and login.
- Added persistent user-specific sessions on the web client and mobile client.
- Added avatar selection and profile avatar persistence.
- Added stricter authentication behavior and session reset handling.

### Groups and Invites

- Added group creation, editing, deletion, and leave-group flows.
- Added email-based group invitations with accept and decline handling.
- Added member-aware group data so each user sees only accepted group memberships and relevant expenses.
- Added group voting thresholds for large shared purchases.

### Expense Tracking

- Added expense creation for shared groups and personal tracking.
- Added equal, percent, and custom split methods.
- Added validation for percent splits and custom splits.
- Added merchant, date, category, reason, and receipt fields on expenses.
- Added personal expenses under the `self` group flow.
- Added filtering so above-threshold expenses affect balances only after approval.

### Voting

- Added automatic vote creation when an expense exceeds the group's threshold.
- Added approve, decline, and undo-vote support.
- Added vote status tracking for pending, approved, and declined requests.
- Added notifications when vote requests are created or resolved.

### Settlements and Payments

- Added per-expense settlement recording.
- Added payment status tracking for open, paid, and payer states.
- Added settlement notifications for payer and payee.
- Improved mobile payment and payout sheet stability.

### Receipts and OCR

- Added receipt image upload support on the backend.
- Added receipt image validation for JPEG, PNG, WebP, GIF, HEIC, and HEIF.
- Added Flutter receipt OCR flows using native/mobile and web recognition paths.
- Improved total extraction and date picker behavior after receipt autofill.

### Budgets and Analytics

- Added personal budget goals for the current month.
- Added category-level budget breakdowns.
- Added dashboard budget progress indicators.
- Added analytics for total spending, average monthly spend, expense counts, group totals, category totals, top expenses, and monthly trends.
- Added drill-down month/category views in the web analytics UI.

### Challenges

- Added group challenges with goals, progress rings, end dates, and contributions.
- Added challenge notifications for new challenges and progress updates.
- Added backend support for challenge types, including group goals and spending-goal style progress.
- Updated the challenges feature and progress UI on the latest main branch.

### AI Assistant

- Added a SplitStack assistant that can answer questions using live workspace data.
- Added Gemini integration through backend-only environment variables.
- Added local fallback responses when Gemini is unavailable or no API key is configured.
- Added assistant action proposals for budget updates, expense logging, challenge creation, challenge contributions, settlement recording, and vote responses.
- Added confirmation before assistant-proposed actions write account data.
- Added quick-reply handling for budget and advice follow-up flows.

### Mobile App

- Added Flutter client support for auth, dashboard data, groups, invites, expenses, votes, analytics, settings, notifications, budgets, challenges, settlements, and assistant chat.
- Added automatic API base URL selection for Chrome, iOS Simulator, Android Emulator, and desktop targets.
- Added dark mode persistence.
- Added mobile smoke/widget tests.
- Fixed Flutter simulator build issues and payment flow crashes.

### Web App

- Refreshed the authenticated workspace UI.
- Improved the overview/home screen, groups screen, vote screen, analytics screen, challenge screen, settings screen, and assistant chat UI.
- Added budget-aware dashboard and analytics components.
- Added inline challenge contribution controls.
- Added receipt attachment and preview behavior.

## Backend and API

- Added Express routes for auth, workspace data, groups, invites, expenses, receipts, settlements, votes, analytics, challenges, notifications, settings, AI chat/actions, and budgets.
- Added SQLite schema bootstrapping and lightweight migrations for newer fields.
- Added SQLite bootstrap data and schema setup for local demos and development.
- Added CORS, request logging, and health check support.

## Fixes and Stabilization

- Fixed expense date picker behavior after receipt autofill.
- Hardened receipt OCR total extraction.
- Fixed challenge contribution and avatar rendering issues.
- Stabilized app shell rebuild behavior during mobile payment flow.
- Fixed payout sheet disposal crash in the mobile payment flow.
- Removed generated and temporary files from repo tracking.
- Refactored frontend, backend, and shared data flow structure.

## Setup Notes

- Use Node.js 22 LTS for the website frontend and backend.
- Start the backend from `website/backend` with `npm install` and `npm run dev`.
- Start the web client from `website/frontend` with `npm install` and `npm run dev`.
- Start the mobile client from `mobile-app` with `flutter pub get` and `flutter run`.
- Configure `GEMINI_API_KEY` and optional `GEMINI_MODEL` in `website/backend/.env` to enable Gemini-backed assistant replies.
- If no Gemini key is configured, the assistant still responds with local workspace summaries.

## Known Limitations

- The repo has no git tags or GitHub release objects yet, so this release note is tied to the current `main` commit instead of a formal tag.
- The app is set up for local/demo usage with SQLite rather than a production deployment profile.
- Fresh-database seed behavior should be verified before a final walkthrough; the release is intended to support real registered demo accounts.
- AI assistant quality depends on available workspace data; sparse expense history produces more limited recommendations.
- Mobile platform setup still depends on the developer's local Flutter, Xcode, Android Studio, and device configuration.

## Suggested Validation

- Run backend lint from `website/backend` with `npm run lint`.
- Run frontend lint/build from `website/frontend` with `npm run lint` and `npm run build`.
- Run mobile tests from `mobile-app` with `flutter test`.
- Exercise the demo flow: register users, create a group, invite a member, accept the invite, add expenses, trigger a vote, approve it, record a settlement, create a challenge, upload a receipt, set a budget, and ask the assistant about balances.
