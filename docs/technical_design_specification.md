# SplitStack Technical and Design Specification

Version: 1.0  
Date: May 2026  
Role Focus: Developer  
Project: SplitStack shared expense management app

## 1. Overview

The notes below cover SplitStack's deployment context, architecture, components, class relationships, sequence flows, API routes, persistence, and local build/deployment setup.

## 2. System Summary

SplitStack is implemented as three coordinated applications:

- `website/backend`: Express API with SQLite persistence through `better-sqlite3`.
- `website/frontend`: React + Vite web app.
- `mobile-app`: Flutter mobile app for iOS, Android, web, macOS, Windows, and Linux targets.

Both clients use the same backend API and the same SQLite database, which keeps the web and mobile workflows consistent.

## 3. Technology Stack

| Layer | Technology |
| --- | --- |
| Backend runtime | Node.js 22 LTS |
| Backend framework | Express 4 |
| Database | SQLite via `better-sqlite3` |
| Backend dev tooling | nodemon, ESLint |
| Web frontend | React 18, Vite |
| Mobile frontend | Flutter, Dart |
| Mobile storage | flutter_secure_storage |
| Mobile HTTP | `http` package |
| Receipt capture | Web file upload, Flutter image picker, OCR helpers |
| AI assistant | Gemini API when configured, local fallback when unavailable |

## 4. Source Layout

```text
cs4800-project/
  README.md
  docs/
    project_charter.md
    functional_requirements_specification.md
    technical_design_specification.md
    splitstack_test_case_specification.md
    project_build_deployment_instructions.md
    project_release_notes.md
    submission_artifact_checklist.md
  planning files/
    Project_Requirements_Specification (2).docx
    SplitStack_Use_Cases (1) (3).docx
    splitstack software architecture.png
    other planning/prototype PDFs and HTML files
  website/
    backend/
      src/app.js
      src/server.js
      src/db.js
      src/routes/api.js
      src/controllers/
      src/services/
      src/middleware/
    frontend/
      src/App.jsx
      src/controllers/useAppController.js
      src/models/appModel.js
      src/services/api.js
      src/views/AppView.jsx
  mobile-app/
    lib/src/app.dart
    lib/src/state/app_controller.dart
    lib/src/data/api_client.dart
    lib/src/data/models.dart
    lib/src/ui/home_shell.dart
    test/
```

## 5. Context / Deployment Diagram

```mermaid
flowchart LR
    subgraph Users
        U1[Web user]
        U2[Mobile user]
    end

    subgraph ClientDevices[Client devices]
        Web[React/Vite web client]
        Mobile[Flutter mobile client]
    end

    subgraph LocalBackend[Local development machine]
        API[Express API on port 3001]
        DB[(SQLite splitstack.db)]
        Receipts[Receipt upload folder]
    end

    subgraph OptionalExternal[Optional external services]
        Gemini[Gemini API]
        OCR[Browser/mobile OCR runtime]
    end

    U1 --> Web
    U2 --> Mobile
    Web -->|HTTP JSON and receipt upload| API
    Mobile -->|HTTP JSON and receipt upload| API
    API --> DB
    API --> Receipts
    API -. optional .-> Gemini
    Mobile -. optional .-> OCR
```

## 6. Architecture Layout

```mermaid
flowchart TB
    subgraph WebClient[React web client]
        ReactView[AppView.jsx]
        ReactController[useAppController.js]
        ReactApi[services/api.js]
        ReactModel[models/appModel.js]
    end

    subgraph MobileClient[Flutter mobile client]
        FlutterUI[home_shell.dart and auth_screen.dart]
        FlutterController[AppController]
        FlutterApi[ApiClient]
        FlutterModels[Dart data models]
        SecureStore[SessionStore]
    end

    subgraph Backend[Express backend]
        App[app.js]
        Router[routes/api.js]
        Middleware[auth middleware]
        Controllers[controllers]
        Services[services]
        Database[db.js]
    end

    SQLite[(SQLite database)]
    Uploads[Receipt uploads]

    ReactView --> ReactController
    ReactController --> ReactApi
    ReactController --> ReactModel
    ReactApi --> Router

    FlutterUI --> FlutterController
    FlutterController --> FlutterApi
    FlutterController --> SecureStore
    FlutterApi --> Router
    FlutterModels --> FlutterController

    App --> Router
    Router --> Middleware
    Router --> Controllers
    Controllers --> Services
    Services --> Database
    Database --> SQLite
    Services --> Uploads
```

## 7. Backend Component Diagram

```mermaid
flowchart LR
    Router[api.js router]
    AuthMW[auth.js middleware]
    AuthC[authController]
    GroupC[groupController]
    ExpenseC[expenseController]
    VoteC[voteController]
    ChallengeC[challengeController]
    WorkspaceC[workspaceController]
    BudgetC[budgetController]

    AuthS[authService]
    GroupS[groupService]
    ExpenseS[expenseService]
    VoteS[voteService]
    ChallengeS[challengeService]
    DashboardS[dashboardService]
    AnalyticsS[analyticsService]
    AssistantS[assistantService]
    AssistantActionS[assistantActionService]
    ReceiptS[receiptService]
    SharedS[sharedService]
    DB[db.js]

    Router --> AuthC
    Router --> AuthMW
    Router --> GroupC
    Router --> ExpenseC
    Router --> VoteC
    Router --> ChallengeC
    Router --> WorkspaceC
    Router --> BudgetC

    AuthC --> AuthS
    GroupC --> GroupS
    ExpenseC --> ExpenseS
    ExpenseC --> ReceiptS
    VoteC --> VoteS
    ChallengeC --> ChallengeS
    WorkspaceC --> DashboardS
    WorkspaceC --> AnalyticsS
    WorkspaceC --> AssistantS
    WorkspaceC --> AssistantActionS

    AuthS --> DB
    GroupS --> DB
    ExpenseS --> DB
    VoteS --> DB
    ChallengeS --> DB
    DashboardS --> ExpenseS
    DashboardS --> AnalyticsS
    AssistantS --> SharedS
    AssistantActionS --> ExpenseS
    SharedS --> DB
```

## 8. Frontend Component Diagram

```mermaid
flowchart TB
    App[App.jsx]
    Controller[useAppController]
    View[AppView]
    Api[splitStackApi]
    Storage[sessionStorage helpers]
    Model[appModel helpers]

    App --> Controller
    App --> View
    Controller --> Api
    Controller --> Storage
    Controller --> Model
    View --> Controller

    subgraph Views[Major rendered views]
        Home[HomePage]
        Groups[GroupsPage]
        Add[AddExpensePage]
        Vote[VotePage]
        Chat[ChatPage]
        Progress[ProgressPage]
        Settings[SettingsPage]
        Analytics[AnalyticsPage]
    end

    View --> Home
    View --> Groups
    View --> Add
    View --> Vote
    View --> Chat
    View --> Progress
    View --> Settings
    View --> Analytics
```

## 9. Mobile Component Diagram

```mermaid
flowchart TB
    App[SplitStackApp]
    Controller[AppController]
    Api[ApiClient]
    Store[SessionStore]
    Models[Dart models]
    Auth[AuthScreen]
    Home[HomeShell]
    Theme[AppTheme]
    OCR[receipt_ocr_stub/web]

    App --> Controller
    App --> Theme
    Controller --> Api
    Controller --> Store
    Api --> Models
    App --> Auth
    App --> Home
    Home --> Controller
    Home --> OCR
```

## 10. Class Hierarchy and Relationship Diagrams

### Backend Controller-Service Relationships

```mermaid
classDiagram
    class ApiRouter {
      +GET /health
      +POST /auth/login
      +POST /auth/register
      +protected routes
    }
    class AuthMiddleware {
      +auth(req,res,next)
    }
    class AuthController {
      +login(req,res)
      +register(req,res)
    }
    class GroupController {
      +list(req,res)
      +create(req,res)
      +update(req,res)
      +remove(req,res)
      +invites(req,res)
      +respondInvite(req,res)
    }
    class ExpenseController {
      +list(req,res)
      +create(req,res)
      +settle(req,res)
      +uploadReceipt(req,res)
    }
    class VoteController {
      +list(req,res)
      +respond(req,res)
      +undo(req,res)
    }
    class WorkspaceController {
      +me(req,res)
      +dashboard(req,res)
      +analytics(req,res)
      +chat(req,res)
      +settings(req,res)
    }
    class Services {
      +authService
      +groupService
      +expenseService
      +voteService
      +dashboardService
      +analyticsService
      +assistantService
      +challengeService
      +receiptService
    }
    class Database {
      +SQLite connection
      +bootstrap()
    }

    ApiRouter --> AuthMiddleware
    ApiRouter --> AuthController
    ApiRouter --> GroupController
    ApiRouter --> ExpenseController
    ApiRouter --> VoteController
    ApiRouter --> WorkspaceController
    AuthController --> Services
    GroupController --> Services
    ExpenseController --> Services
    VoteController --> Services
    WorkspaceController --> Services
    Services --> Database
```

### Flutter Data Model Relationships

```mermaid
classDiagram
    class UserSession {
      User user
      String token
    }
    class User {
      String id
      String name
      String email
      String initials
      String avatarColor
      String avatarEmoji
    }
    class DashboardData {
      BalanceSummary balance
      int pendingVotes
    }
    class BalanceSummary {
      double net
      double totalOwedToYou
      double totalYouOwe
      List~CounterpartyBalance~ owedToYou
      List~CounterpartyBalance~ youOwe
    }
    class Group {
      String id
      String name
      double threshold
      List~GroupMember~ members
      List~PendingInvite~ pendingInvites
    }
    class Expense {
      String id
      String groupId
      double amount
      String paidById
      List~ExpenseSplit~ splits
    }
    class Vote {
      String id
      String status
      List~VoteDecision~ decisions
    }
    class ChallengeData {
      List~Challenge~ challenges
      List~ChallengeRing~ rings
    }
    class SettingsData
    class BudgetGoal
    class AppNotification

    UserSession --> User
    DashboardData --> BalanceSummary
    BalanceSummary --> CounterpartyBalance
    Group --> GroupMember
    Group --> PendingInvite
    Expense --> ExpenseSplit
    Vote --> VoteDecision
    ChallengeData --> Challenge
    ChallengeData --> ChallengeRing
```

### Client Controller Relationships

```mermaid
classDiagram
    class useAppController {
      +loadAll()
      +saveGroup()
      +submitExpense()
      +handleVoteResponse()
      +saveSettings()
      +sendChat()
      +confirmAiAction()
    }
    class splitStackApi {
      +login()
      +register()
      +loadWorkspace()
      +createExpense()
      +uploadReceipt()
      +sendChat()
    }
    class AppController {
      +initialize()
      +refreshAll()
      +createGroup()
      +createExpense()
      +uploadReceipt()
      +respondToVote()
      +sendChat()
    }
    class ApiClient {
      +login()
      +register()
      +getDashboard()
      +getGroups()
      +createExpense()
      +uploadReceipt()
    }
    class SessionStore {
      +readToken()
      +writeToken()
      +clear()
    }

    useAppController --> splitStackApi
    AppController --> ApiClient
    AppController --> SessionStore
```

## 11. API Surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check. |
| POST | `/api/auth/register` | No | Register account and return session. |
| POST | `/api/auth/login` | No | Authenticate and return session. |
| GET | `/api/me` | Yes | Load current user and invites. |
| PUT | `/api/me` | Yes | Update profile fields. |
| GET | `/api/dashboard` | Yes | Load dashboard balances, analytics, notifications, and pending vote count. |
| GET/POST | `/api/groups` | Yes | List or create groups. |
| PUT/DELETE | `/api/groups/:id` | Yes | Update or delete group. |
| DELETE | `/api/groups/:id/membership` | Yes | Leave group. |
| GET | `/api/invites` | Yes | List pending invites. |
| POST | `/api/invites/:id/respond` | Yes | Accept or decline invite. |
| GET/POST | `/api/expenses` | Yes | List or create expenses. |
| POST | `/api/receipts` | Yes | Upload receipt image bytes. |
| POST | `/api/expenses/:id/settlements` | Yes | Record settlement payment. |
| GET | `/api/votes` | Yes | List group votes. |
| POST | `/api/votes/:id/respond` | Yes | Approve or decline vote. |
| DELETE | `/api/votes/:id/respond` | Yes | Undo pending vote response. |
| GET | `/api/analytics` | Yes | Load spending analytics. |
| GET/POST | `/api/challenges` | Yes | List or create challenges. |
| POST | `/api/challenges/:id/contribute` | Yes | Add challenge contribution. |
| GET | `/api/notifications` | Yes | List notifications. |
| POST | `/api/notifications/:id/read` | Yes | Mark notification read. |
| GET/PUT | `/api/settings` | Yes | Load or update settings. |
| GET/POST | `/api/budget` | Yes | Load or save budget goal. |
| POST | `/api/ai/chat` | Yes | Ask assistant. |
| POST | `/api/ai/actions/confirm` | Yes | Execute confirmed assistant action. |

## 12. Sequence Diagrams

### Login

```mermaid
sequenceDiagram
    participant User
    participant Client as React/Flutter Client
    participant API as Express API
    participant Auth as authService
    participant DB as SQLite

    User->>Client: Enter email and password
    Client->>API: POST /api/auth/login
    API->>Auth: loginUser(credentials)
    Auth->>DB: Query user by email/password
    DB-->>Auth: User row
    Auth-->>API: User and token
    API-->>Client: 200 JSON session
    Client->>Client: Store token
    Client->>API: Load workspace endpoints
```

### Create Group with Invites

```mermaid
sequenceDiagram
    participant Owner
    participant Client
    participant API
    participant GroupService
    participant SharedService
    participant DB

    Owner->>Client: Submit group form
    Client->>API: POST /api/groups
    API->>GroupService: createGroup(payload)
    GroupService->>DB: Insert group
    GroupService->>DB: Insert owner membership
    GroupService->>SharedService: Normalize invite emails
    GroupService->>DB: Insert pending invites
    GroupService->>DB: Insert notifications
    GroupService-->>API: Created group
    API-->>Client: 201 group JSON
    Client->>API: Refresh workspace
```

### Create Expense Below Threshold

```mermaid
sequenceDiagram
    participant Member
    participant Client
    participant API
    participant ExpenseService
    participant DB

    Member->>Client: Enter expense and splits
    Client->>API: POST /api/expenses
    API->>ExpenseService: createExpense(payload)
    ExpenseService->>DB: Load group and members
    ExpenseService->>DB: Insert expense
    ExpenseService->>DB: Insert expense_splits
    ExpenseService-->>API: Saved expense
    API-->>Client: 201 expense JSON
    Client->>API: GET /api/dashboard
    API-->>Client: Recalculated balances
```

### Create Above-Threshold Expense and Vote

```mermaid
sequenceDiagram
    participant Member
    participant Client
    participant API
    participant ExpenseService
    participant VoteService
    participant DB

    Member->>Client: Submit expense above threshold
    Client->>API: POST /api/expenses
    API->>ExpenseService: createExpense(payload)
    ExpenseService->>DB: Insert expense with vote_id
    ExpenseService->>DB: Insert proposed splits
    ExpenseService->>DB: Insert pending vote
    ExpenseService->>DB: Insert requester yes decision
    ExpenseService->>DB: Notify other members
    ExpenseService-->>API: triggeredVote id
    API-->>Client: 201 with triggeredVote
    Client->>API: GET /api/votes
    API->>VoteService: getVotes(userId)
    VoteService-->>API: Pending vote list
    API-->>Client: Votes JSON
```

### Respond to Vote

```mermaid
sequenceDiagram
    participant Voter
    participant Client
    participant API
    participant VoteService
    participant DB

    Voter->>Client: Approve or decline
    Client->>API: POST /api/votes/:id/respond
    API->>VoteService: respondToVote(voteId, decision, userId)
    VoteService->>DB: Upsert vote_decision
    VoteService->>DB: Count yes/no decisions
    alt Any no
        VoteService->>DB: Mark vote declined
    else All yes
        VoteService->>DB: Mark vote approved
    else Still waiting
        VoteService->>DB: Keep vote pending
    end
    VoteService-->>API: Updated vote
    API-->>Client: Updated vote JSON
```

### Record Settlement

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant ExpenseService
    participant DB

    User->>Client: Choose payment method
    Client->>API: POST /api/expenses/:id/settlements
    API->>ExpenseService: createSettlement()
    ExpenseService->>DB: Validate membership and remaining amount
    ExpenseService->>DB: Insert settlement
    ExpenseService->>DB: Insert payer/payee notifications
    ExpenseService-->>API: Settlement result
    API-->>Client: 201 settlement JSON
    Client->>API: Refresh dashboard and expenses
```

### Receipt Upload

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant ReceiptService
    participant Disk as Upload folder

    User->>Client: Select or capture receipt image
    Client->>API: POST /api/receipts raw image
    API->>ReceiptService: saveReceiptImageBytes()
    ReceiptService->>ReceiptService: Validate type and size
    ReceiptService->>Disk: Write image file
    ReceiptService-->>API: /receipts/file URL
    API-->>Client: 201 receiptUrl
    Client->>API: POST /api/expenses with receiptUrl
```

### AI Chat with Confirmed Action

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant API
    participant Assistant
    participant Actions
    participant DB

    User->>Client: Ask assistant question
    Client->>API: POST /api/ai/chat
    API->>Assistant: generateAiReply(userId, message, history)
    Assistant->>DB: Load groups, expenses, analytics, votes, budget
    Assistant-->>API: Reply and optional action proposal
    API-->>Client: Assistant message
    User->>Client: Confirm proposed action
    Client->>API: POST /api/ai/actions/confirm
    API->>Actions: executeAssistantAction(userId, action)
    Actions->>DB: Save expense/budget/challenge/settlement/vote
    Actions-->>API: Result
    API-->>Client: Action result
    Client->>API: Refresh workspace
```

## 13. Persistence Design

The backend initializes the SQLite schema in `website/backend/src/db.js`. Tables are created if missing, and lightweight migrations add columns for existing local databases. WAL mode and foreign-key enforcement are enabled.

Main persistence groups:

- Identity: `users`, `user_settings`, `user_payout_profiles`.
- Groups: `groups_table`, `group_members`, `group_invites`.
- Ledger: `expenses`, `expense_splits`, `settlements`.
- Governance: `votes`, `vote_decisions`.
- User feedback: `notifications`.
- Goals and insights: `challenges`, `challenge_contributions`, `budget_goals`, `ai_chat_usage`.

## 14. Security Design

- Public routes are limited to health, login, and registration.
- Protected routes pass through `auth` middleware.
- Backend services check group membership before returning or mutating group data.
- Group deletion and update require owner access.
- Receipt uploads validate image signature/type and enforce size limits.
- AI actions use a confirmation endpoint before mutating data.

Prototype limitation: passwords are stored in the local SQLite database for class/demo use and should be hashed before any production deployment.

## 15. Error Handling

- Express error middleware returns JSON errors for oversized bodies, invalid JSON, and uncaught server failures.
- API helpers in React and Flutter surface backend messages to UI state.
- Receipt upload returns user-readable validation failures.
- Missing or unavailable Gemini configuration falls back to local assistant responses.

## 16. Deployment Design

The final project is intended for local development/demo deployment:

- Backend runs at `http://localhost:3001`.
- React dev server runs at `http://localhost:5173`.
- Flutter web/mobile clients point to the backend, using platform-specific default host rules.
- SQLite database is created under `website/backend/src/../splitstack.db`.
- Receipt images are stored under `website/backend/uploads/receipts`.

Detailed commands are in `docs/project_build_deployment_instructions.md`.
