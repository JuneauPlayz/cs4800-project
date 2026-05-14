# SplitStack Project Release Notes

Version: 1.0.0  
Release Type: CS 4800 project handoff  
Date: May 2026

## 1. Release Summary

SplitStack 1.0.0 includes a working shared expense management app with a Node/Express/SQLite backend, React/Vite web frontend, Flutter mobile client, and the project documentation under `docs/`.

The release supports real persisted accounts, groups, invites, expense splitting, voting, settlements, analytics, budget goals, challenges, notifications, receipt attachments, and AI assistant workflows.

## 2. Delivered Features

| Area | Delivered Capability |
| --- | --- |
| Authentication | Register, login, logout, session persistence, profile avatar updates. |
| Groups | Create, edit, delete, leave, invite members, accept/decline invites. |
| Expenses | Add group and personal expenses with category, date, description, receipt URL, and split method. |
| Splits | Equal, percentage, and custom amount split handling. |
| Voting | Above-threshold expenses create votes; members approve, decline, or undo pending decisions. |
| Balances | Dashboard calculates net balance, owed-to-you, you-owe, and people summaries. |
| Settlements | Users can record payments against outstanding expense shares. |
| Receipts | Web and mobile clients can attach receipt images; backend validates and stores uploads. |
| Mobile OCR | Flutter receipt helper extracts likely amount and date from receipt text in supported flows. |
| Analytics | Spending totals by category, month, frequency, and top expenses. |
| Budgets | Monthly budget goal and category breakdown storage. |
| Challenges | Group challenges, progress rings, member progress, and contributions. |
| Notifications | In-app notifications for invites, groups, votes, balances, settlements, and challenges. |
| Settings | Notification and privacy preference updates. |
| AI Assistant | Workspace-aware assistant answers, local fallback, and confirmable actions. |
| Documentation | PM, BA, DEV, QA, build/deployment, release notes, and checklist artifacts. |

## 3. Source Components

| Component | Location |
| --- | --- |
| Backend API | `website/backend` |
| Web frontend | `website/frontend` |
| Mobile app | `mobile-app` |
| Submission docs | `docs` |
| Supporting planning files | `planning files` |

## 4. Compatibility

| Runtime | Expected Version |
| --- | --- |
| Node.js | 22 LTS |
| npm | Bundled with Node.js 22 |
| Flutter | Current stable SDK compatible with Dart SDK `^3.10.8` |
| Browser | Modern Chromium/Safari/Firefox for web client |
| Database | Local SQLite file managed by backend |

## 5. Configuration Notes

- Backend default port: `3001`.
- Web frontend default port: `5173`.
- Gemini AI key is optional and configured in `website/backend/.env`.
- Without a Gemini key, the backend returns local assistant summaries.
- SQLite database is local to `website/backend/splitstack.db`.
- Receipt files are stored under `website/backend/uploads/receipts`.

## 6. Known Limitations

| Limitation | Notes |
| --- | --- |
| Prototype authentication | Passwords are stored for local demo use and should be hashed before production. |
| No real money transfer | Settlements are records of payment, not bank or payment processor transactions. |
| No production notification provider | Notifications are stored and displayed in-app only. |
| Local deployment | The submitted deployment target is local development/demo, not cloud production. |
| Optional AI dependency | Gemini calls require a key and network access; local fallback is provided. |
| Owner transfer not implemented | Owners cannot leave their group; delete is supported. |
| Blockchain and premium billing deferred | These were planning/stretch features and are outside the delivered 1.0.0 scope. |

## 7. Verification Summary

Latest local verification:

| Check | Result |
| --- | --- |
| Backend `npm run lint` | Pass |
| Backend `npm run build` | Pass, no backend build step required |
| Frontend `npm run lint` | Pass |
| Frontend `npm run build` | Pass |
| Mobile `flutter test` | Pass, 25 tests |
| Mobile `flutter analyze` | Pass, no issues found |

Recommended verification commands:

```bash
cd website/backend && npm run lint
cd website/frontend && npm run lint && npm run build
cd mobile-app && flutter test && flutter analyze
```

The QA specification in `docs/splitstack_test_case_specification.md` includes the test strategy, test plan, traceability matrix, test cases, and test results summary.

## 8. Upgrade / Future Work

- Hash passwords and add stronger auth tokens for production readiness.
- Add backend automated tests for API routes and ledger calculations.
- Add production email/push notification integrations.
- Add real payment provider integration for settlements.
- Add hosted cloud deployment with environment-specific configuration.
- Expand role management, group owner transfer, and audit logging.
- Add export features for CSV/PDF group financial reports.

## 9. Handoff Check

- Source code is present in backend, frontend, and mobile directories.
- Required documentation artifacts are present in `docs/`.
- Build/deployment commands are documented.
- QA test cases and traceability matrix are documented.
- Verification commands have been run or blockers are documented.
