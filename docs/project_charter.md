# SplitStack Project Charter

Version: 1.0  
Date: May 2026  
Project: SplitStack shared expense management app  
Course: CS 4800

## 1. Purpose

SplitStack is a shared expense management system for roommates, trips, families, and other groups that need a transparent way to record purchases, split costs, vote on large expenses, settle balances, and understand spending patterns.

The sections below cover the goal, scope, stakeholders, schedule, assumptions, risks, and handoff files for the project.

## 2. Problem Statement

Shared finances often rely on manual notes, screenshots, group chats, and memory. This creates confusion about who paid, who owes, whether a purchase was approved, and whether balances are up to date. SplitStack addresses this by providing a single source of truth for group expenses and balances with built-in approval workflows and reporting.

## 3. Project Objectives

| Objective ID | Objective | Success Measure |
| --- | --- | --- |
| OBJ-01 | Allow users to create accounts and access their own workspace. | Users can register, log in, log out, and reload persisted sessions. |
| OBJ-02 | Support group-based shared expense tracking. | Users can create groups, invite members, accept invites, and view member-aware data. |
| OBJ-03 | Support flexible expense splitting. | Expenses can be split equally, by percentage, or by custom amounts. |
| OBJ-04 | Maintain accurate group balances. | Dashboard balances reflect approved expenses and completed settlements. |
| OBJ-05 | Add group governance for large purchases. | Expenses above the group threshold create votes and do not affect balances until approved. |
| OBJ-06 | Provide mobile and web access. | React web client and Flutter mobile client both use the same API and database. |
| OBJ-07 | Provide project documentation. | PM, BA, DEV, QA, build/deploy, release notes, and source code are present in the repo. |

## 4. Scope

### In Scope

- Email/password registration and login.
- User profile avatar settings.
- Group creation, editing, deletion, leaving, invites, and invite responses.
- Shared expense creation with equal, percentage, and custom split methods.
- Receipt image attachment for expenses.
- Automatic vote creation for expenses above a group threshold.
- Voting responses, vote approval, vote decline, and vote undo while pending.
- Dashboard balances, totals, people summaries, and recent financial state.
- Settlement recording for outstanding expense shares.
- Analytics by category, month, frequency, and top expenses.
- Budget goal tracking for the current month.
- Group challenges and challenge contributions.
- Notifications and settings.
- AI assistant answers and confirmable assistant actions, with local fallback behavior.
- React/Vite frontend, Express/SQLite backend, and Flutter mobile client.
- Documentation under `docs/`.

### Out of Scope

- Real money movement through a bank or payment gateway.
- Production payment processor integration.
- Production email, SMS, or push-notification delivery.
- Production cloud deployment.
- Premium billing and subscription management.
- Blockchain audit trail.
- Full admin console for system operators.

## 5. Stakeholders

| Stakeholder | Role / Interest |
| --- | --- |
| Project team | Builds and documents the project. |
| Instructor / grader | Evaluates project completeness, implementation quality, and documentation. |
| Group member user | Records expenses, views balances, votes, settles, and manages preferences. |
| Group owner/admin user | Creates groups, invites members, sets thresholds, and manages group records. |
| QA role | Verifies implemented behavior against use cases and requirements. |
| Developer role | Designs, implements, builds, tests, and documents deployment steps. |
| Business analyst role | Defines requirements, use cases, workflows, and domain model. |
| Project manager role | Defines scope, schedule, handoff files, and risks. |

## 6. Handoff Files

| File / Folder | Location |
| --- | --- |
| Project charter | `docs/project_charter.md` |
| Functional / requirements specification | `docs/functional_requirements_specification.md` |
| Technical / design specification | `docs/technical_design_specification.md` |
| Test case specification and traceability matrix | `docs/splitstack_test_case_specification.md` |
| Build and deployment instructions | `docs/project_build_deployment_instructions.md` and `README.md` |
| Release notes | `docs/project_release_notes.md` |
| Source code | `website/backend`, `website/frontend`, `mobile-app` |
| Supporting planning artifacts | `planning files/` |

## 7. High-Level Schedule

| Phase | Work Products | Completion Criteria |
| --- | --- | --- |
| Planning | Requirements, use cases, risk notes, prototype artifacts. | Problem, users, features, and risks are documented. |
| MVP implementation | Backend API, SQLite persistence, React client, Flutter client. | Core workflows work end to end with persistent data. |
| Enhancement implementation | Receipt upload, analytics, challenges, budget goals, assistant features. | Enhanced workflows are integrated into the same data model. |
| QA and stabilization | Test cases, lint/build/test runs, bug fixes. | Key use cases have traceable test cases and verification results. |
| Handoff | PM, BA, DEV, QA, build/deploy, release notes, source code. | Checklist items are mapped to files in the repository. |

## 8. Assumptions

- The grader can review Markdown documentation directly from the repository.
- Node.js 22 LTS, npm, and Flutter are available or can be installed from the documented instructions.
- The application is evaluated as a local development/demo project.
- SQLite is acceptable for local project persistence.
- Gemini API access is optional; the assistant has a local fallback when no key is configured.
- Real payment processing is represented by settlement records rather than external transfers.

## 9. Constraints

- Class project timeline.
- Local development environment rather than production infrastructure.
- No external database server required.
- Network-dependent AI features must degrade gracefully when not configured.
- Security is appropriate for a classroom prototype, not a production financial platform.

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Required file is hard to find | Grader may miss work that is already done | Keep the checklist and README artifact table up to date. |
| Backend and clients drift apart | Broken demo workflows | Both React and Flutter clients call the same Express API. |
| Incorrect balance calculations | Loss of trust in app results | Store expenses and splits separately; test balance and settlement workflows. |
| Vote workflow confusion | Expenses may appear before approval | Expenses tied to pending votes are hidden from balances until approved. |
| Local environment setup issues | Demo cannot run | Provide separate backend, frontend, and mobile instructions plus troubleshooting. |
| Optional AI service unavailable | Assistant feature fails | Backend supports local fallback summaries. |
| Receipt files too large or invalid | Upload failures | Backend validates image type and size; mobile compresses images before upload. |

## 11. Handoff Checklist

- All source code is present for backend, frontend, and mobile app.
- The backend can start and respond to `/api/health`.
- The web client can build successfully.
- The mobile app can run tests successfully.
- Required PM, BA, DEV, QA, build/deploy, and release-note documents are present.
- Use cases are traceable to requirements and test cases.
- Required diagrams are included in the BA and DEV specifications.
- Known limitations are documented in release notes.
