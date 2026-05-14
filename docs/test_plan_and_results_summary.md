# SplitStack Test Plan and Results Summary

Version: 1.1  
Date: May 2026  
Related test case specification: `docs/splitstack_test_case_specification.md`

## Test Strategy and Approach

SplitStack testing combines black-box functional testing, automated lint/build checks, and focused mobile widget/unit tests.

Primary strategy:

- Validate user-visible behavior against the main use cases.
- Confirm authentication prevents unauthenticated workspace access.
- Verify group and invite workflows across multiple users.
- Verify expense split validation and balance updates.
- Verify above-threshold expenses require voting before affecting balances.
- Verify settlements reduce open payment status.
- Verify receipt OCR extraction and receipt upload behavior.
- Verify analytics, budget, challenge, notification, and assistant flows.
- Run static checks and build checks before final submission.

## Test Scope

In scope:

- Account registration and login.
- Group creation, editing, deletion, leave group, and invite response.
- Expense entry with equal, percent, custom, and personal split flows.
- Vote creation, approval, decline, and undo behavior.
- Dashboard balances and analytics.
- Settlement recording.
- Challenge creation and contribution.
- Settings and notification read state.
- AI assistant responses and confirmation-required actions.
- Web build/lint and backend lint.
- Existing Flutter tests for mobile UI and receipt parsing.

Not covered in this local test pass:

- Production load testing over a multi-day window.
- Real payment processor integration testing.
- Public app-store release testing.
- Security penetration testing beyond membership and auth validation.

## Test Environment

| Item | Value |
| --- | --- |
| OS used for documentation validation | macOS local development environment |
| Node version expected | Node.js 22 LTS |
| Backend | Express API on port 3001 |
| Web frontend | Vite dev server on port 5173 |
| Database | Local SQLite database |
| Mobile | Flutter project under `mobile-app/` |

## Test Data

Walkthrough data:

- Register at least two real demo accounts.
- Create one shared group.
- Invite the second account by email.
- Add one below-threshold expense.
- Add one above-threshold expense to trigger a vote.
- Accept or decline the new vote from all relevant members.
- Record one settlement payment.
- Add at least one personal expense.
- Add one challenge and one contribution.
- Upload at least one receipt image.
- Set a monthly budget with category breakdowns.
- Ask the assistant about balances and budget recommendations.

## Entry Criteria

- Backend dependencies installed.
- Frontend dependencies installed.
- Backend starts successfully.
- Frontend starts successfully.
- Test users are available or can be registered.
- Mobile Flutter SDK is installed if mobile test execution is required.

## Exit Criteria

- Critical user workflows pass in manual testing.
- Backend lint passes.
- Frontend lint passes.
- Frontend production build passes.
- Mobile test status is recorded.
- Known limitations are documented.

## Traceability

Detailed test cases and traceability matrix are maintained in:

```text
docs/splitstack_test_case_specification.md
```

That file maps test cases TC-01 through TC-16 to the main use cases UC-01 through UC-11.

## Automated Validation Results

Commands run during this documentation pass:

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Backend lint | `npm run lint` from `website/backend` | Pass | ESLint completed successfully. |
| Backend build check | `npm run build` from `website/backend` | Pass | Backend reports no build step is required. |
| Frontend lint | `npm run lint` from `website/frontend` | Pass | ESLint completed successfully. |
| Frontend build | `npm run build` from `website/frontend` | Pass | Vite production build completed successfully. |
| Mobile tests | `flutter test` from `mobile-app` | Pass | 25 Flutter tests passed. |
| Mobile analyzer | `flutter analyze` from `mobile-app` | Pass | Analyzer reported no issues. |

## Existing Mobile Test Coverage

The repository includes Flutter tests in `mobile-app/test/` that cover:

- SplitStack login screen rendering.
- Receipt OCR amount extraction.
- Receipt OCR date extraction.
- Date picker editability after receipt autofill.
- Payout sheet payment method selection.
- Challenge tab rendering and member spending progress.

These should be run with:

```bash
cd mobile-app
flutter test
```

## Manual Test Results Summary

| Test Case | Scenario | Result | Notes |
| --- | --- | --- | --- |
| TC-01 | Register a new user account | Pass |  |
| TC-02 | Reject login with invalid credentials | Pass |  |
| TC-03 | Create a new group with invite | Pass |  |
| TC-04 | Accept a pending group invite | Pass |  |
| TC-05 | Add an equal split expense | Pass |  |
| TC-06 | Reject invalid percent split expense | Pass |  |
| TC-07 | Create vote for expense above threshold | Pass |  |
| TC-08 | Approve a pending expense vote | Pass |  |
| TC-09 | Decline a pending expense vote | Pass |  |
| TC-10 | View dashboard balances | Pass |  |
| TC-11 | Record a settlement payment | Pass |  |
| TC-12 | Create a savings challenge | Pass |  |
| TC-13 | Add contribution to savings challenge | Pass |  |
| TC-14 | View analytics | Pass |  |
| TC-15 | Update settings and mark notification read | Pass |  |
| TC-16 | Ask AI assistant a question | Pass |  |

## Known Test Gaps

- Manual end-to-end test results should be rechecked during the final live demo flow.
- Performance and uptime criteria from the requirements document are specified but not fully measured in this local validation pass.
- Gemini-backed assistant behavior requires a valid `GEMINI_API_KEY`; without it, local fallback behavior should be tested instead.
