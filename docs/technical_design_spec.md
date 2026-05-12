# SplitStack Technical Design Specification

Version: 1.0  
Date: May 12, 2026  
Project: SplitStack shared budgeting and expense management app

## Technical Overview

SplitStack uses a three-part architecture:

- React/Vite web client for the browser workspace.
- Flutter mobile app for mobile and desktop-supported client targets.
- Express/SQLite backend API for authentication, business logic, persistence, receipts, AI assistant calls, and shared workspace data.

The backend is the system of record. Both clients call the same REST API and use the same database-backed workflows for groups, expenses, votes, settlements, analytics, budgets, challenges, notifications, and settings.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Web frontend | React 18, Vite, JavaScript, CSS |
| Mobile client | Flutter, Dart |
| Backend | Node.js 22 LTS, Express |
| Database | SQLite through `better-sqlite3` |
| Auth/session | Bearer token issued by backend |
| Receipt storage | Local backend uploads directory served at `/receipts` |
| AI assistant | Gemini API when configured, local fallback otherwise |
| OCR | Mobile/web recognition paths plus backend receipt persistence |
| Testing | ESLint, Flutter widget/unit tests, manual black-box test cases |

## Context and Deployment Diagram

```mermaid
flowchart LR
  User["Group Member / Owner"] --> Web["React/Vite Web Client"]
  User --> Mobile["Flutter Mobile Client"]

  Web --> API["Express REST API"]
  Mobile --> API

  API --> DB[("SQLite database")]
  API --> Uploads["Receipt image uploads"]
  API --> Gemini["Gemini API\noptional"]

  Web --> DiceBear["DiceBear avatar SVGs"]
  Mobile --> OCR["Device/Web OCR services"]
  OCR --> Mobile

  subgraph LocalDemo["Local demo deployment"]
    Web
    Mobile
    API
    DB
    Uploads
  end
```

## Architecture Layout

```mermaid
flowchart TB
  subgraph WebClient["website/frontend"]
    WebView["AppView.jsx\nvisual screens"]
    WebController["useAppController.js\nstate and workflow"]
    WebApi["services/api.js\nREST client"]
    WebModel["models/appModel.js\nconstants and helpers"]
    WebView --> WebController
    WebController --> WebApi
    WebController --> WebModel
  end

  subgraph MobileClient["mobile-app/lib/src"]
    MobileApp["app.dart"]
    HomeShell["ui/home_shell.dart"]
    AppController["state/app_controller.dart"]
    ApiClient["data/api_client.dart"]
    Models["data/models.dart"]
    SessionStore["data/session_store.dart"]
    MobileApp --> HomeShell
    HomeShell --> AppController
    AppController --> ApiClient
    AppController --> Models
    AppController --> SessionStore
  end

  subgraph Backend["website/backend/src"]
    Server["server.js"]
    App["app.js"]
    Router["routes/api.js"]
    Controllers["controllers/*"]
    Services["services/*"]
    Database["db.js"]
    Middleware["middleware/auth.js"]
    Server --> App
    App --> Router
    Router --> Middleware
    Router --> Controllers
    Controllers --> Services
    Services --> Database
  end

  WebApi --> Router
  ApiClient --> Router
```

## Backend Component Diagram

```mermaid
flowchart LR
  ApiRoutes["api.js routes"] --> AuthMiddleware["auth middleware"]
  ApiRoutes --> AuthController["authController"]
  ApiRoutes --> WorkspaceController["workspaceController"]
  ApiRoutes --> GroupController["groupController"]
  ApiRoutes --> ExpenseController["expenseController"]
  ApiRoutes --> VoteController["voteController"]
  ApiRoutes --> ChallengeController["challengeController"]
  ApiRoutes --> BudgetController["budgetController"]

  AuthController --> AuthService["authService"]
  WorkspaceController --> DashboardService["dashboardService"]
  WorkspaceController --> AnalyticsService["analyticsService"]
  WorkspaceController --> AssistantService["assistantService"]
  WorkspaceController --> AssistantActionService["assistantActionService"]
  GroupController --> GroupService["groupService"]
  ExpenseController --> ExpenseService["expenseService"]
  ExpenseController --> ReceiptService["receiptService"]
  VoteController --> VoteService["voteService"]
  ChallengeController --> ChallengeService["challengeService"]
  BudgetController --> BudgetService["budgetController"]

  AuthService --> SharedService["sharedService"]
  GroupService --> SharedService
  ExpenseService --> SharedService
  VoteService --> SharedService
  ChallengeService --> SharedService

  SharedService --> DB["SQLite via db.js"]
  AuthService --> DB
  ExpenseService --> DB
  VoteService --> DB
  ChallengeService --> DB
  BudgetService --> DB
  AnalyticsService --> DB
```

## Component Responsibilities

| Component | Responsibility |
| --- | --- |
| Web `AppView` | Renders authenticated workspace, auth screens, dashboard, groups, expenses, votes, assistant, challenges, and settings. |
| Web `useAppController` | Holds web app state, validates forms, calls API methods, refreshes workspace data, and coordinates UI workflows. |
| Web `splitStackApi` | Wraps all browser REST API calls. |
| Mobile `AppController` | Central mobile state manager for auth, refresh, polling, groups, expenses, votes, budgets, challenges, settings, and chat. |
| Mobile `ApiClient` | HTTP client and JSON mapping bridge to the backend API. |
| Mobile `models.dart` | Client-side domain model classes for backend response payloads. |
| Backend controllers | HTTP request validation and response formatting. |
| Backend services | Business rules, persistence operations, calculations, notifications, AI action execution, and receipt handling. |
| `db.js` | SQLite connection, schema creation, and local bootstrap data. |

## Class Hierarchy and Relationship Diagram

The JavaScript backend is mostly organized around modules and functions. The clearest class model exists in the Flutter mobile client, where backend API payloads are represented as Dart model classes.

```mermaid
classDiagram
  class AppController {
    +User user
    +DashboardData dashboard
    +List~Group~ groups
    +List~Expense~ expenses
    +List~Vote~ votes
    +ChallengeData challengeData
    +SettingsData settings
    +BudgetGoal budgetGoal
    +login()
    +refreshAll()
    +createExpense()
    +respondToVote()
    +recordExpensePayment()
  }

  class ApiClient {
    +String baseUrl
    +login()
    +register()
    +getDashboard()
    +createExpense()
    +uploadReceipt()
  }

  class SessionStore {
    +readToken()
    +writeToken()
    +clear()
  }

  class UserSession
  class User
  class DashboardData
  class BalanceSummary
  class CounterpartyBalance
  class PersonBalance
  class Group
  class GroupMember
  class PendingInvite
  class GroupInvite
  class Expense
  class ExpenseSplit
  class Vote
  class VoteDecision
  class AnalyticsData
  class CategorySpend
  class GroupSpend
  class ChallengeData
  class Challenge
  class ChallengeRing
  class ChallengeMemberProgress
  class SettingsData
  class AppNotification
  class ChatMessage
  class BudgetGoal

  AppController --> ApiClient
  AppController --> SessionStore
  AppController --> User
  AppController --> DashboardData
  AppController --> Group
  AppController --> Expense
  AppController --> Vote
  AppController --> ChallengeData
  AppController --> SettingsData
  AppController --> BudgetGoal

  UserSession --> User
  DashboardData --> BalanceSummary
  BalanceSummary --> CounterpartyBalance
  BalanceSummary --> PersonBalance
  Group --> GroupMember
  Group --> PendingInvite
  Expense --> ExpenseSplit
  Vote --> VoteDecision
  AnalyticsData --> CategorySpend
  AnalyticsData --> GroupSpend
  ChallengeData --> Challenge
  ChallengeData --> ChallengeRing
  Challenge --> ChallengeMemberProgress
```

## Sequence Diagram: Login and Workspace Load

```mermaid
sequenceDiagram
  actor User
  participant Client as Web or Mobile Client
  participant API as Express API
  participant Auth as Auth Service
  participant DB as SQLite

  User->>Client: Enter credentials
  Client->>API: POST /api/auth/login
  API->>Auth: Validate credentials
  Auth->>DB: Query user by email
  DB-->>Auth: User row
  Auth-->>API: User and session token
  API-->>Client: 200 user/token
  Client->>API: GET workspace endpoints with Bearer token
  API->>DB: Load dashboard, groups, expenses, votes, analytics, settings
  DB-->>API: Workspace data
  API-->>Client: Workspace payloads
  Client-->>User: Show dashboard
```

## Sequence Diagram: Create Expense with Voting Threshold

```mermaid
sequenceDiagram
  actor User
  participant Client
  participant API as Express API
  participant Expense as Expense Service
  participant Vote as Vote Service
  participant DB as SQLite

  User->>Client: Submit expense
  Client->>API: POST /api/expenses
  API->>API: Validate required fields and splits
  API->>Expense: createExpense(payload)
  Expense->>DB: Insert expense and split rows
  Expense->>DB: Read group threshold
  alt Amount exceeds threshold
    Expense->>DB: Insert pending vote
    Expense->>DB: Insert requester's yes decision
    Expense->>DB: Insert notifications
    Expense-->>API: triggeredVote id
  else Amount within threshold
    Expense-->>API: saved expense
  end
  API-->>Client: Created response
  Client->>API: Reload workspace data
  API-->>Client: Updated balances and votes
```

## Sequence Diagram: Vote Resolution

```mermaid
sequenceDiagram
  actor Member
  participant Client
  participant API
  participant VoteService
  participant DB

  Member->>Client: Approve or decline vote
  Client->>API: POST /api/votes/:id/respond
  API->>VoteService: respondToVote(voteId, decision, userId)
  VoteService->>DB: Upsert vote_decisions row
  VoteService->>DB: Count yes/no decisions
  alt Any no vote
    VoteService->>DB: Set vote status declined
  else All members yes
    VoteService->>DB: Set vote status approved
  else Still waiting
    VoteService->>DB: Keep vote pending
  end
  VoteService-->>API: Updated vote
  API-->>Client: Vote payload
  Client->>API: Refresh expenses and dashboard
```

## Sequence Diagram: Receipt Upload

```mermaid
sequenceDiagram
  actor User
  participant Client
  participant OCR as OCR Pipeline
  participant API
  participant Receipt as Receipt Service
  participant Files as Receipt Upload Directory

  User->>Client: Select receipt image
  Client->>OCR: Recognize text
  OCR-->>Client: Extracted text
  Client->>Client: Autofill amount/date when confident
  User->>Client: Submit expense
  Client->>API: POST /api/receipts with image bytes
  API->>Receipt: Validate type and size
  Receipt->>Files: Save image with generated filename
  Files-->>Receipt: Saved URL
  Receipt-->>API: /receipts/file.ext
  API-->>Client: receiptUrl
  Client->>API: POST /api/expenses with receiptUrl
```

## Sequence Diagram: Assistant Action Confirmation

```mermaid
sequenceDiagram
  actor User
  participant Client
  participant API
  participant Assistant as Assistant Service
  participant Actions as Assistant Action Service
  participant DB
  participant Gemini as Gemini API

  User->>Client: Ask assistant to analyze or change data
  Client->>API: POST /api/ai/chat
  API->>Assistant: Build workspace summary
  alt Gemini configured
    Assistant->>Gemini: Generate response
    Gemini-->>Assistant: Reply
  else Gemini unavailable
    Assistant-->>API: Local fallback reply
  end
  API->>Actions: Build proposed action if supported
  Actions-->>API: Proposed action or null
  API-->>Client: Reply and proposed action
  User->>Client: Confirm proposed action
  Client->>API: POST /api/ai/actions/confirm
  API->>Actions: Execute action
  Actions->>DB: Insert or update account data
  DB-->>Actions: Saved result
  API-->>Client: Confirmation result
```

## API Surface Summary

| Area | Endpoints |
| --- | --- |
| Health/Auth | `GET /api/health`, `POST /api/auth/login`, `POST /api/auth/register` |
| Workspace | `GET /api/me`, `PUT /api/me`, `GET /api/dashboard` |
| Groups/Invites | `GET/POST/PUT/DELETE /api/groups`, `DELETE /api/groups/:id/membership`, `GET /api/invites`, `POST /api/invites/:id/respond` |
| Expenses/Receipts | `GET /api/expenses`, `POST /api/expenses`, `POST /api/receipts`, `POST /api/expenses/:id/settlements` |
| Votes | `GET /api/votes`, `POST /api/votes/:id/respond`, `DELETE /api/votes/:id/respond` |
| Analytics/Budgets | `GET /api/analytics`, `GET /api/budget`, `POST /api/budget` |
| Challenges | `GET /api/challenges`, `POST /api/challenges`, `POST /api/challenges/:id/contribute` |
| Notifications/Settings | `GET /api/notifications`, `POST /api/notifications/:id/read`, `GET /api/settings`, `PUT /api/settings` |
| Assistant | `POST /api/ai/chat`, `POST /api/ai/actions/confirm` |

## Security Design

- Authenticated routes require a Bearer token.
- Backend middleware resolves the token to a current user before protected controllers run.
- Group, invite, expense, vote, and challenge operations validate membership before reading or modifying protected group data.
- Gemini API keys are read only by the backend from `.env`, not exposed in the web or mobile bundle.
- Receipt uploads validate file type and size before storage.

## Data Persistence Design

- SQLite is used as the local system of record.
- `db.js` creates tables when the backend starts.
- Lightweight schema migration helpers add columns for newer features.
- Receipt images are stored on disk and referenced by URL in expense rows.

## Quality Attribute Notes

| Attribute | Design Support |
| --- | --- |
| Maintainability | Separate controller/service/database modules and separate web/mobile clients. |
| Portability | Local web app, Flutter mobile client, and configurable API base URLs. |
| Reliability | Backend validation for required fields, split totals, memberships, receipt types, and assistant action confirmation. |
| Usability | Dashboard-first navigation, direct group/vote/settlement flows, receipt autofill, and assistant quick replies. |
| Security | Auth middleware, membership checks, server-side AI key storage, and receipt validation. |

