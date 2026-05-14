# SplitStack Project Source Code Manifest

Version: 1.1  
Date: May 2026

## Source Code Location

The project source code is contained in the repository root:

```text
cs4800-project/
```

Repository URL:

```text
https://github.com/JuneauPlayz/cs4800-project
```

## Main Source Directories

| Path | Purpose |
| --- | --- |
| `website/frontend/` | React/Vite web client. |
| `website/backend/` | Express/SQLite backend API. |
| `mobile-app/` | Flutter mobile client. |
| `docs/` | Final PM, BA, DEV, QA, build/deployment, release, and submission mapping documentation. |
| `planning files/` | Existing project planning artifacts, requirements, use cases, business plan, prototypes, and architecture image. |

## Web Frontend Source

| Path | Purpose |
| --- | --- |
| `website/frontend/src/main.jsx` | React entry point. |
| `website/frontend/src/App.jsx` | App composition entry. |
| `website/frontend/src/views/AppView.jsx` | Main UI screens and workspace rendering. |
| `website/frontend/src/controllers/useAppController.js` | State, form handling, polling, and workflow control. |
| `website/frontend/src/services/api.js` | REST API client. |
| `website/frontend/src/services/sessionStorage.js` | Browser session persistence. |
| `website/frontend/src/models/appModel.js` | Shared UI constants, initial state, and helper functions. |
| `website/frontend/src/styles.css` | Web UI styles. |

## Backend Source

| Path | Purpose |
| --- | --- |
| `website/backend/src/server.js` | Starts the Express server. |
| `website/backend/src/app.js` | Configures middleware, static receipt serving, routes, and error handling. |
| `website/backend/src/routes/api.js` | REST API route map. |
| `website/backend/src/controllers/` | HTTP controllers for auth, groups, expenses, votes, challenges, budgets, and workspace operations. |
| `website/backend/src/services/` | Business logic for auth, groups, expenses, votes, analytics, assistant, receipts, budgets, and shared helpers. |
| `website/backend/src/middleware/auth.js` | Bearer-token authentication middleware. |
| `website/backend/src/config/env.js` | Environment-variable loading. |
| `website/backend/src/db.js` | SQLite connection, schema bootstrap, migrations, and local data setup. |

## Mobile App Source

| Path | Purpose |
| --- | --- |
| `mobile-app/lib/main.dart` | Flutter entry point. |
| `mobile-app/lib/src/app.dart` | Main Flutter app shell. |
| `mobile-app/lib/src/core/app_theme.dart` | App theme definitions. |
| `mobile-app/lib/src/state/app_controller.dart` | Mobile state manager and workflow controller. |
| `mobile-app/lib/src/data/api_client.dart` | REST API client for Flutter. |
| `mobile-app/lib/src/data/models.dart` | Dart data models for backend payloads. |
| `mobile-app/lib/src/data/session_store.dart` | Secure session and preference storage. |
| `mobile-app/lib/src/data/receipt_ocr_web.dart` | Web OCR interop path. |
| `mobile-app/lib/src/data/receipt_ocr_stub.dart` | Non-web receipt OCR stub. |
| `mobile-app/lib/src/ui/auth_screen.dart` | Mobile auth UI. |
| `mobile-app/lib/src/ui/home_shell.dart` | Main mobile workspace UI. |
| `mobile-app/test/` | Flutter unit/widget tests. |

## Final Documentation Source

| Path | Purpose |
| --- | --- |
| `docs/project_charter.md` | Project charter for PM review. |
| `docs/functional_requirements_specification.md` | BA requirements, use cases, activity diagrams, domain model, and ER diagram. |
| `docs/technical_design_specification.md` | DEV technical design, deployment/context, architecture, component, class, and sequence diagrams. |
| `docs/splitstack_test_case_specification.md` | QA strategy, test plan, traceability matrix, test cases, and results summary. |
| `docs/project_build_deployment_instructions.md` | Project build and deployment instructions. |
| `docs/project_release_notes.md` | Final release notes. |
| `docs/README.md` | Direct checklist-to-file mapping for grading. |
