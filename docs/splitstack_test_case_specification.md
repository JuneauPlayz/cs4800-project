# SplitStack Test Case Specification and Traceability Matrix

Version: 1.1
Date: May 2026
Testing Type: Black-box testing, smoke testing, build verification, and static analysis
Project: SplitStack shared budgeting and expense management app

## 1. Overview

The test cases below cover the main SplitStack use cases from the user's point of view. Each case lists the setup, input, steps, and expected result, followed by a traceability matrix.

## 2. Main Use Cases

| Use Case ID | Use Case Name | Actor | Requirement |
| --- | --- | --- | --- |
| UC-01 | Create Account and Authenticate | Group Member | A user can register, log in, and access the SplitStack workspace. |
| UC-02 | Create and Manage Group | Group Owner/Admin | A user can create a group, set a voting threshold, and invite members. |
| UC-03 | Join Existing Group | Group Member | An invited user can accept or decline a group invitation. |
| UC-04 | Log Expense with Split Options | Group Member | A user can add an expense and split it equally, by percentage, or by custom amounts. |
| UC-05 | Vote on Proposed Expense | Group Member | Expenses above the group threshold require member approval before affecting balances. |
| UC-06 | View Dashboard and Balances | Group Member | A user can view balances, totals, and recent group activity. |
| UC-07 | Settle Outstanding Balance | Group Member | A user can record a settlement payment and reduce outstanding balances. |
| UC-08 | Create and Contribute to Challenge | Group Member | A user can create a savings challenge and add contributions. |
| UC-09 | View Analytics and Insights | Group Member | A user can view spending analytics based on saved expense data. |
| UC-10 | Update Settings and Notifications | Group Member | A user can update settings and mark notifications as read. |
| UC-11 | Chat with AI Assistant | Group Member | A user can ask the SplitStack assistant questions about their data. |

## 3. Test Strategy/Approach

SplitStack testing combines black-box functional testing with automated smoke checks and build verification. The test approach is designed around user-visible behavior because the final project is evaluated through implemented workflows and documented requirements.

| Test Type | Purpose | Scope |
| --- | --- | --- |
| Black-box functional tests | Verify each major use case from the user's point of view. | Authentication, groups, invites, expenses, votes, settlements, analytics, challenges, settings, notifications, assistant. |
| Traceability review | Confirm that use cases are covered by test cases. | Matrix in section 6 maps every primary use case to one or more test cases. |
| Automated mobile widget/unit tests | Verify critical Flutter UI and receipt parsing behavior. | Login screen, receipt amount/date extraction, date picker, payment sheet, challenges tab. |
| Static analysis | Catch syntax, lint, and analyzer issues before submission. | Backend ESLint, frontend ESLint, Flutter analyzer. |
| Build verification | Confirm submitted source can produce a runnable web build. | React/Vite production build. |
| Manual demo testing | Validate end-to-end behavior with real local backend state. | Register users, create group, invite, add expense, vote, settle, inspect dashboard. |

Testing priorities:

- P0: User cannot authenticate, load workspace, or access app.
- P1: Group, expense, vote, balance, or settlement data is incorrect.
- P2: Analytics, challenges, assistant, receipt, settings, or notification behavior is incomplete.
- P3: Copy, polish, minor layout, and non-blocking warnings.

## 4. Test Plan

| Plan Item | Details |
| --- | --- |
| Test environment | Local macOS development machine using Node.js, npm, Flutter, SQLite, and browser/mobile simulators. |
| Backend under test | `website/backend`, Express API on `http://localhost:3001`. |
| Web client under test | `website/frontend`, React/Vite app on `http://localhost:5173`. |
| Mobile client under test | `mobile-app`, Flutter app using the same backend API. |
| Test data | Fresh registered users and/or optional seeded demo data through `SPLITSTACK_SEED_DEMO=true`. |
| Entry criteria | Dependencies installed, backend starts, frontend starts/builds, mobile dependencies resolve. |
| Exit criteria | Required test cases are documented; automated verification commands pass or blockers are documented; known limitations are listed in release notes. |
| Risks tested | Unauthorized access, incorrect balances, unapproved expenses affecting balances, settlement overpayment, stale UI states, receipt upload errors. |
| Regression focus | Authentication, expense splitting, vote resolution, settlement recording, receipt parsing, and dashboard refresh. |

Recommended test execution order:

1. Run backend lint.
2. Run frontend lint and production build.
3. Run Flutter tests and analyzer.
4. Start backend and frontend.
5. Execute manual black-box test cases TC-01 through TC-16.
6. Record results and any defects before submission.

## 5. Test Case Specification

### TC-01: Register a New User Account

| Field | Details |
| --- | --- |
| Related Use Case | UC-01 |
| Objective | Verify that a new user can create a SplitStack account. |
| Preconditions | The app is running and the email is not already registered. |
| Inputs | Name: `Alex Tester`; Email: `alex.tester@example.com`; Password: `Password123!` |
| Steps | 1. Open the SplitStack app. 2. Click `Create account`. 3. Enter name, email, and password. 4. Submit the registration form. |
| Expected Output | The account is created successfully. The user is taken to the authenticated workspace and their name/email are displayed. |

### TC-02: Reject Login with Invalid Credentials

| Field | Details |
| --- | --- |
| Related Use Case | UC-01 |
| Objective | Verify that the system rejects invalid login attempts. |
| Preconditions | The app is running. |
| Inputs | Email: `wrong@example.com`; Password: `incorrect-password` |
| Steps | 1. Open the login page. 2. Enter invalid email and password. 3. Submit the login form. |
| Expected Output | The user remains on the login screen and an error message is displayed. The workspace is not shown. |

### TC-03: Create a New Group with Invite

| Field | Details |
| --- | --- |
| Related Use Case | UC-02 |
| Objective | Verify that a user can create a group and invite another member. |
| Preconditions | User is logged in. |
| Inputs | Group Name: `Apartment 4B`; Type: `Roommates`; Voting Threshold: `$100`; Invite Email: `sam.member@example.com` |
| Steps | 1. Go to the `Groups` page. 2. Open the create group form. 3. Enter group name, type, threshold, and invite email. 4. Submit the form. |
| Expected Output | The group appears in the user's group list. The voting threshold is saved. The invited email appears as a pending invite. |

### TC-04: Accept a Pending Group Invite

| Field | Details |
| --- | --- |
| Related Use Case | UC-03 |
| Objective | Verify that an invited user can join an existing group. |
| Preconditions | User has a pending group invite. |
| Inputs | Invite Decision: `Accept` |
| Steps | 1. Log in as the invited user. 2. Open the pending invite area. 3. Select `Accept`. 4. Navigate to `Groups`. |
| Expected Output | The invite is removed from the pending list. The group appears in the user's group list. |

### TC-05: Add an Equal Split Expense

| Field | Details |
| --- | --- |
| Related Use Case | UC-04, UC-06 |
| Objective | Verify that a group member can add an expense split equally among members. |
| Preconditions | User belongs to a group with at least two members. |
| Inputs | Group: `Apartment 4B`; Description: `Groceries`; Amount: `$60`; Category: `Groceries`; Split Method: `Equal` |
| Steps | 1. Go to `Add Expense`. 2. Select the group. 3. Enter expense description, amount, and category. 4. Select equal split. 5. Submit the expense. 6. Open the dashboard or group detail page. |
| Expected Output | The expense is saved and displayed. The amount is divided equally among group members. Dashboard balances update to include the expense. |

### TC-06: Reject Invalid Percent Split Expense

| Field | Details |
| --- | --- |
| Related Use Case | UC-04 |
| Objective | Verify that percent split expenses must total 100%. |
| Preconditions | User belongs to a group with multiple members. |
| Inputs | Amount: `$100`; Split Method: `Percent`; Member Percentages Total: `90%` |
| Steps | 1. Go to `Add Expense`. 2. Select percent split. 3. Enter percentages that total 90%. 4. Submit the expense. |
| Expected Output | The system rejects the expense or displays a validation error. The expense is not saved. |

### TC-07: Create Vote for Expense Above Threshold

| Field | Details |
| --- | --- |
| Related Use Case | UC-05 |
| Objective | Verify that an expense above the voting threshold creates a pending vote. |
| Preconditions | User belongs to a group with voting threshold `$100`. |
| Inputs | Description: `New couch`; Amount: `$150`; Category: `Furniture`; Reason: `Shared living room furniture` |
| Steps | 1. Go to `Add Expense`. 2. Enter an expense above the group threshold. 3. Submit the expense. 4. Open `Group Voting`. |
| Expected Output | A pending vote is created for the expense. The expense is not added to balances until approved. |

### TC-08: Approve a Pending Expense Vote

| Field | Details |
| --- | --- |
| Related Use Case | UC-05, UC-06 |
| Objective | Verify that an approved vote causes the expense to count toward balances. |
| Preconditions | A pending vote exists for an above-threshold expense. |
| Inputs | Vote Decision: `Approve` from all required group members |
| Steps | 1. Log in as each voting member. 2. Open `Group Voting`. 3. Approve the pending expense. 4. Open the dashboard or expense list. |
| Expected Output | The vote status changes to approved. The expense appears in the expense list. Dashboard balances include the approved expense. |

### TC-09: Decline a Pending Expense Vote

| Field | Details |
| --- | --- |
| Related Use Case | UC-05 |
| Objective | Verify that a declined vote prevents an expense from affecting balances. |
| Preconditions | A pending vote exists for an above-threshold expense. |
| Inputs | Vote Decision: `Decline` |
| Steps | 1. Log in as a group member. 2. Open `Group Voting`. 3. Decline the pending expense. 4. Open the dashboard or expense list. |
| Expected Output | The vote status changes to declined. The expense does not appear as an approved expense and balances do not include it. |

### TC-10: View Dashboard Balances

| Field | Details |
| --- | --- |
| Related Use Case | UC-06 |
| Objective | Verify that the dashboard displays correct financial information. |
| Preconditions | User belongs to at least one group with saved approved expenses. |
| Inputs | Existing group and expense data |
| Steps | 1. Log in. 2. Open the Home dashboard. 3. Review total owed, total owed to user, group totals, and recent activity. |
| Expected Output | Dashboard displays balances and activity based on the user's accepted groups and approved expenses. |

### TC-11: Record a Settlement Payment

| Field | Details |
| --- | --- |
| Related Use Case | UC-07 |
| Objective | Verify that a user can record a payment toward an outstanding balance. |
| Preconditions | User owes another group member money. |
| Inputs | Payee: owed member; Amount: `$25`; Method: `Venmo`; Note: `Partial payment` |
| Steps | 1. Open the dashboard. 2. Select the settlement option for an outstanding balance. 3. Enter payee, amount, method, and note. 4. Submit the settlement. |
| Expected Output | Settlement is saved. Settlement history updates. The outstanding balance is reduced by `$25`. |

### TC-12: Create a Savings Challenge

| Field | Details |
| --- | --- |
| Related Use Case | UC-08 |
| Objective | Verify that a user can create a group savings challenge. |
| Preconditions | User belongs to at least one group. |
| Inputs | Challenge Name: `Save for deposit`; Goal: `$500`; End Date: future date |
| Steps | 1. Go to `Challenges`. 2. Enter challenge name, group, goal, and end date. 3. Submit the challenge form. |
| Expected Output | The challenge is created and displayed with a progress indicator. |

### TC-13: Add Contribution to Savings Challenge

| Field | Details |
| --- | --- |
| Related Use Case | UC-08 |
| Objective | Verify that challenge progress updates after a contribution. |
| Preconditions | A savings challenge exists. |
| Inputs | Contribution Amount: `$50` |
| Steps | 1. Open `Challenges`. 2. Select an existing challenge. 3. Enter a contribution amount. 4. Submit the contribution. |
| Expected Output | The contribution is saved. Challenge progress increases by `$50`. |

### TC-14: View Analytics

| Field | Details |
| --- | --- |
| Related Use Case | UC-09 |
| Objective | Verify that analytics display spending summaries. |
| Preconditions | User has at least one approved expense. |
| Inputs | Existing approved expenses in one or more categories |
| Steps | 1. Log in. 2. Go to `Analytics`. 3. Review totals, categories, and group summaries. |
| Expected Output | Analytics page displays spending totals based on saved approved expenses. |

### TC-15: Update Settings and Mark Notification Read

| Field | Details |
| --- | --- |
| Related Use Case | UC-10 |
| Objective | Verify that user settings and notification read status can be updated. |
| Preconditions | User is logged in and has at least one notification. |
| Inputs | Preference change; Notification action: `Mark as read` |
| Steps | 1. Go to `Settings`. 2. Change a preference. 3. Save settings. 4. Mark a notification as read. |
| Expected Output | Preference is saved. Notification read status updates and unread count decreases. |

### TC-16: Ask AI Assistant a Question

| Field | Details |
| --- | --- |
| Related Use Case | UC-11 |
| Objective | Verify that the AI assistant accepts a user question and returns a response. |
| Preconditions | User is logged in and backend is running. |
| Inputs | Question: `How much do I owe?` |
| Steps | 1. Go to `AI Assistant`. 2. Type the question. 3. Submit the message. |
| Expected Output | The user's question appears in the chat. The assistant returns a response or displays an error if the request cannot be completed. |

## 6. Traceability Matrix

| Test Case ID | Test Case Name | UC-01 | UC-02 | UC-03 | UC-04 | UC-05 | UC-06 | UC-07 | UC-08 | UC-09 | UC-10 | UC-11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Register a New User Account | X |  |  |  |  |  |  |  |  |  |  |
| TC-02 | Reject Login with Invalid Credentials | X |  |  |  |  |  |  |  |  |  |  |
| TC-03 | Create a New Group with Invite |  | X |  |  | X |  |  |  |  |  |  |
| TC-04 | Accept a Pending Group Invite |  |  | X |  |  |  |  |  |  |  |  |
| TC-05 | Add an Equal Split Expense |  |  |  | X |  | X |  |  |  |  |  |
| TC-06 | Reject Invalid Percent Split Expense |  |  |  | X |  |  |  |  |  |  |  |
| TC-07 | Create Vote for Expense Above Threshold |  |  |  |  | X |  |  |  |  |  |  |
| TC-08 | Approve a Pending Expense Vote |  |  |  |  | X | X |  |  |  |  |  |
| TC-09 | Decline a Pending Expense Vote |  |  |  |  | X |  |  |  |  |  |  |
| TC-10 | View Dashboard Balances |  |  |  |  |  | X |  |  |  |  |  |
| TC-11 | Record a Settlement Payment |  |  |  |  |  |  | X |  |  |  |  |
| TC-12 | Create a Savings Challenge |  |  |  |  |  |  |  | X |  |  |  |
| TC-13 | Add Contribution to Savings Challenge |  |  |  |  |  |  |  | X |  |  |  |
| TC-14 | View Analytics |  |  |  |  |  |  |  |  | X |  |  |
| TC-15 | Update Settings and Mark Notification Read |  |  |  |  |  |  |  |  |  | X |  |
| TC-16 | Ask AI Assistant a Question |  |  |  |  |  |  |  |  |  |  | X |

## 7. Coverage Summary

| Use Case ID | Use Case Name | Covered By |
| --- | --- | --- |
| UC-01 | Create Account and Authenticate | TC-01, TC-02 |
| UC-02 | Create and Manage Group | TC-03 |
| UC-03 | Join Existing Group | TC-04 |
| UC-04 | Log Expense with Split Options | TC-05, TC-06 |
| UC-05 | Vote on Proposed Expense | TC-03, TC-07, TC-08, TC-09 |
| UC-06 | View Dashboard and Balances | TC-05, TC-08, TC-10 |
| UC-07 | Settle Outstanding Balance | TC-11 |
| UC-08 | Create and Contribute to Challenge | TC-12, TC-13 |
| UC-09 | View Analytics and Insights | TC-14 |
| UC-10 | Update Settings and Notifications | TC-15 |
| UC-11 | Chat with AI Assistant | TC-16 |

## 8. Test Results Summary

Latest local verification results:

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Backend lint | `cd website/backend && npm run lint` | Pass | ESLint completed with no reported issues. |
| Backend build check | `cd website/backend && npm run build` | Pass | Backend reports no build step is required. |
| Frontend lint | `cd website/frontend && npm run lint` | Pass | ESLint completed with no reported issues. |
| Frontend production build | `cd website/frontend && npm run build` | Pass | Vite built 32 modules successfully. |
| Flutter tests | `cd mobile-app && flutter test` | Pass | 25 tests passed, including receipt OCR parsing, auth smoke test, payment sheet, date picker, and challenges tab. |
| Flutter static analysis | `cd mobile-app && flutter analyze` | Pass | Analyzer reported "No issues found." |

Non-blocking notes:

- Flutter reported that 12 packages have newer versions incompatible with current dependency constraints. This is informational and did not block tests or analysis.
- Manual black-box test cases TC-01 through TC-16 remain the recommended final demo checklist because they verify complete workflows across the running backend, web frontend, and mobile client.
