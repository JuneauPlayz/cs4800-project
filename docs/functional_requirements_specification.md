# SplitStack Functional and Requirements Specification

Version: 1.0  
Date: May 2026  
Role Focus: Business Analyst  
Project: SplitStack shared expense management app

## 1. Overview

These requirements match the implemented system in `website/backend`, `website/frontend`, and `mobile-app`.

## 2. Product Overview

SplitStack helps groups manage shared finances. Users create accounts, form groups, invite members, log expenses, split costs, vote on large purchases, settle balances, view analytics, manage challenges, and ask an AI assistant questions about live workspace data.

## 3. Actors

| Actor | Description |
| --- | --- |
| Guest | Unauthenticated person who can register or log in. |
| Group Member | Authenticated user who belongs to one or more groups and can add expenses, vote, settle, and view dashboards. |
| Group Owner/Admin | Group member with elevated group control such as editing or deleting a group and inviting members. |
| AI Assistant | System feature that answers questions and proposes confirmable actions based on workspace data. |
| OCR / Receipt Capture Service | Browser/mobile OCR helper and upload pipeline for receipt images. |
| Notification Service | In-app notification mechanism for invites, votes, balances, settlements, and challenges. |

## 4. Functional Requirements

| ID | Requirement | Priority | Implemented Evidence |
| --- | --- | --- | --- |
| FR-01 | Users can register, log in, log out, and access an authenticated workspace. | Must | `authService.js`, `authController.js`, React auth form, Flutter auth screen. |
| FR-02 | Users can create, edit, delete, leave, and list groups. | Must | `groupService.js`, `/api/groups`, React Groups page, Flutter group controls. |
| FR-03 | Group owners can invite members by email, and invited users can accept or decline. | Must | `group_invites`, `/api/invites`, invite notifications. |
| FR-04 | Users can create expenses with amount, description, category, date, group, payer, split method, and optional receipt. | Must | `expenseService.js`, `/api/expenses`, `/api/receipts`. |
| FR-05 | Expenses can be split equally, by percentage, or by custom member amounts. | Must | `expense_splits`, React split controls, Flutter split controls. |
| FR-06 | Expenses above a group threshold create a pending vote and do not affect balances until approved. | Must | `votes`, `vote_decisions`, `createExpense`, `respondToVote`. |
| FR-07 | Members can approve, decline, or undo pending votes. | Must | `/api/votes/:id/respond`, `DELETE /api/votes/:id/respond`. |
| FR-08 | Users can view dashboard balances, totals owed, people summaries, and pending vote counts. | Must | `dashboardService.js`, `calculateBalances`. |
| FR-09 | Users can record settlements for outstanding expense shares. | Must | `settlements`, `/api/expenses/:id/settlements`. |
| FR-10 | Users can view analytics by category, month, top expenses, and frequency. | Should | `analyticsService.js`, `/api/analytics`. |
| FR-11 | Users can set and save monthly budget goals. | Should | `budget_goals`, `budgetController.js`. |
| FR-12 | Users can create savings/spending challenges and add contributions. | Should | `challengeService.js`, `/api/challenges`. |
| FR-13 | Users can view and mark notifications as read. | Should | `notifications`, `/api/notifications`. |
| FR-14 | Users can update account, notification, and privacy settings. | Should | `user_settings`, `/api/settings`, `/api/me`. |
| FR-15 | Users can ask the AI assistant questions and confirm proposed actions. | Should | `assistantService.js`, `assistantActionService.js`, `/api/ai/chat`. |
| FR-16 | Users can upload receipt images and attach saved receipt URLs to expenses. | Should | `receiptService.js`, web upload panel, mobile image picker/OCR flow. |

## 5. Non-Functional Requirements

| ID | Requirement | How It Is Checked |
| --- | --- | --- |
| NFR-01 | Usability | A new user can register, create a group, add an expense, and view balances without code changes. |
| NFR-02 | Performance | Local API actions return quickly for classroom/demo data volumes. |
| NFR-03 | Reliability | App handles missing AI key by returning local assistant summaries instead of failing the workspace. |
| NFR-04 | Data Integrity | Expenses and expense splits are stored separately; balances are calculated from persisted ledger data. |
| NFR-05 | Security | Authenticated routes require bearer-token middleware; group operations require membership or ownership. |
| NFR-06 | Portability | App runs locally using Node.js, npm, SQLite, and Flutter without external database setup. |
| NFR-07 | Maintainability | Backend is separated into routes, controllers, services, database bootstrap, and middleware. |

## 6. Use Cases

### UC-01: Create Account and Authenticate

| Field | Details |
| --- | --- |
| Primary Actor | Guest |
| Goal | Create an account or log into an existing account. |
| Preconditions | App is running. |
| Trigger | User submits registration or login form. |
| Main Flow | User enters credentials; system validates; system returns user data and token; client stores session; workspace loads. |
| Alternate Flow | Invalid credentials return an error and user remains on auth screen. |
| Postconditions | Authenticated user can access protected workspace data. |
| Related Requirements | FR-01 |

### UC-02: Create and Manage Group

| Field | Details |
| --- | --- |
| Primary Actor | Group Owner/Admin |
| Goal | Create or update a shared expense group. |
| Preconditions | User is authenticated. |
| Trigger | User submits group form. |
| Main Flow | User enters name, type, threshold, description, invites; system creates group; system adds owner as member; system creates pending invites. |
| Alternate Flow | Duplicate quick resubmission reuses the recent group and adds missing invites. |
| Postconditions | Group appears in the owner's group list. |
| Related Requirements | FR-02, FR-03 |

### UC-03: Join Existing Group

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Accept or decline a group invitation. |
| Preconditions | User email matches a pending invite. |
| Trigger | User responds to invite. |
| Main Flow | System updates invite status; accepted invite creates group membership; owner receives notification. |
| Alternate Flow | Declined invite notifies owner and does not create membership. |
| Postconditions | Invite is no longer pending for that user. |
| Related Requirements | FR-03, FR-13 |

### UC-04: Log Expense with Split Options

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Add a shared expense to a group. |
| Preconditions | User belongs to at least one group. |
| Trigger | User submits add expense form. |
| Main Flow | User enters expense details; chooses split method; optionally attaches receipt; system saves expense and splits. |
| Alternate Flow | If amount exceeds threshold, system creates a vote and withholds the expense from balances until approved. |
| Postconditions | Expense is stored, or a pending vote is created. |
| Related Requirements | FR-04, FR-05, FR-06, FR-16 |

### UC-05: Vote on Proposed Expense

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Approve or decline an above-threshold expense. |
| Preconditions | Pending vote exists for a group the user belongs to. |
| Trigger | User selects approve or decline. |
| Main Flow | System records decision; unanimous yes approves; any no declines; requester receives notification. |
| Alternate Flow | User can undo while vote remains pending. |
| Postconditions | Approved vote makes linked expense count toward balances; declined vote excludes it. |
| Related Requirements | FR-06, FR-07 |

### UC-06: View Dashboard and Balances

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Understand current financial position. |
| Preconditions | User is authenticated. |
| Trigger | User opens Home dashboard or refreshes workspace. |
| Main Flow | System loads groups, approved expenses, splits, settlements, votes, analytics, and notifications. |
| Postconditions | User sees net balance, owed-to-you, you-owe, pending votes, and recent activity. |
| Related Requirements | FR-08, FR-10, FR-13 |

### UC-07: Settle Outstanding Balance

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Record payment toward an expense owed to another member. |
| Preconditions | User owes money on an approved expense. |
| Trigger | User selects payment method and submits settlement. |
| Main Flow | System validates remaining amount; inserts completed settlement; sends notifications; balances recalculate. |
| Postconditions | Expense payment status and dashboard balances update. |
| Related Requirements | FR-09 |

### UC-08: Create and Contribute to Challenge

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Create a group challenge and track progress. |
| Preconditions | User belongs to group. |
| Trigger | User submits challenge form or contribution amount. |
| Main Flow | System creates challenge; members receive notification; contributions update current progress. |
| Postconditions | Challenge appears with progress ring and contribution history. |
| Related Requirements | FR-12 |

### UC-09: View Analytics and Budget

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Understand spending totals and budget status. |
| Preconditions | User has expenses or a budget goal. |
| Trigger | User opens Analytics or budget card. |
| Main Flow | System aggregates user share by category, month, top expenses, and budget breakdown. |
| Postconditions | User sees spending summaries and saved budget goal. |
| Related Requirements | FR-10, FR-11 |

### UC-10: Chat with AI Assistant

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Secondary Actor | AI Assistant |
| Goal | Ask questions or request supported workspace actions. |
| Preconditions | User is authenticated. |
| Trigger | User sends a chat message. |
| Main Flow | System builds workspace context; assistant returns answer or action proposal; user can confirm supported actions. |
| Alternate Flow | If Gemini is unavailable, system returns local summary/advice. |
| Postconditions | User receives response; confirmed actions update workspace data. |
| Related Requirements | FR-15 |

### UC-11: Update Settings and Notifications

| Field | Details |
| --- | --- |
| Primary Actor | Group Member |
| Goal | Manage preferences and notification read state. |
| Preconditions | User is authenticated. |
| Trigger | User changes settings or marks notification read. |
| Main Flow | System saves settings and updates notification unread flag. |
| Postconditions | Preferences and unread count reflect the change. |
| Related Requirements | FR-13, FR-14 |

## 7. Activity Diagrams

### Account Authentication Activity

```mermaid
flowchart TD
    A[Open SplitStack] --> B{Has account?}
    B -->|No| C[Enter name, email, password, avatar]
    B -->|Yes| D[Enter email and password]
    C --> E[Submit register request]
    D --> F[Submit login request]
    E --> G{Credentials valid?}
    F --> G
    G -->|No| H[Show error on auth screen]
    G -->|Yes| I[Return user and token]
    I --> J[Store session]
    J --> K[Load dashboard, groups, expenses, votes, settings]
    K --> L[Show workspace]
```

### Group Invite Activity

```mermaid
flowchart TD
    A[Owner opens Groups] --> B[Enter group details]
    B --> C[Add invite emails]
    C --> D[Submit group]
    D --> E[Create group record]
    E --> F[Create owner membership]
    F --> G[Create pending invites]
    G --> H[Notify invited registered users]
    H --> I[Invitee logs in]
    I --> J{Accept invite?}
    J -->|Yes| K[Create group membership]
    J -->|No| L[Mark invite declined]
    K --> M[Notify owner]
    L --> M
```

### Expense Below Threshold Activity

```mermaid
flowchart TD
    A[Member opens Add Expense] --> B[Select group and payer]
    B --> C[Enter amount, category, date, description]
    C --> D[Choose split method]
    D --> E{Attach receipt?}
    E -->|Yes| F[Upload receipt image]
    E -->|No| G[Submit expense]
    F --> G
    G --> H{Amount above threshold?}
    H -->|No| I[Save expense]
    I --> J[Save expense_splits]
    J --> K[Recalculate dashboard balances]
    K --> L[Show expense history]
```

### Expense Vote Activity

```mermaid
flowchart TD
    A[Submit above-threshold expense] --> B[Save expense with vote_id]
    B --> C[Save proposed splits]
    C --> D[Create pending vote]
    D --> E[Requester's yes vote recorded]
    E --> F[Notify other members]
    F --> G[Members approve or decline]
    G --> H{Any no?}
    H -->|Yes| I[Vote declined]
    H -->|No| J{All members yes?}
    J -->|No| K[Vote remains pending]
    J -->|Yes| L[Vote approved]
    L --> M[Expense included in balances]
    I --> N[Expense excluded from balances]
```

### Settlement Activity

```mermaid
flowchart TD
    A[User sees amount owed] --> B[Choose payment action]
    B --> C[Select payment method and optional note]
    C --> D[Submit settlement]
    D --> E{Remaining balance exists?}
    E -->|No| F[Show validation error]
    E -->|Yes| G[Insert completed settlement]
    G --> H[Notify payer and payee]
    H --> I[Recalculate balances]
    I --> J[Show updated payment status]
```

### AI Assistant Activity

```mermaid
flowchart TD
    A[User sends chat message] --> B[Backend loads workspace context]
    B --> C[Build assistant response and possible action proposal]
    C --> D{External AI configured?}
    D -->|Yes| E[Call Gemini model]
    D -->|No| F[Generate local fallback reply]
    E --> G[Return answer/proposal]
    F --> G
    G --> H{User confirms action?}
    H -->|No| I[Keep chat history]
    H -->|Yes| J[Execute allowed action]
    J --> K[Refresh workspace data]
```

## 8. Domain Object Model

| Domain Object | Responsibility |
| --- | --- |
| User | Represents a registered person with identity, credentials, initials, avatar, and settings. |
| UserSettings | Stores notification and privacy preferences. |
| Group | Represents a shared expense workspace with type, owner, threshold, and description. |
| GroupMember | Links users to groups with a role. |
| GroupInvite | Tracks invited emails, statuses, inviter, and response time. |
| Expense | Represents a purchase or payment event with amount, category, payer, date, receipt, and optional vote. |
| ExpenseSplit | Stores the amount owed by each user for an expense. |
| Vote | Represents approval workflow for an above-threshold expense. |
| VoteDecision | Records one member's yes/no decision for a vote. |
| Settlement | Records payment from one user to another for an outstanding expense. |
| Notification | Stores in-app alert title, body, type, unread state, and timestamp. |
| Challenge | Represents a group goal or spending challenge. |
| ChallengeContribution | Records a user's contribution to a challenge. |
| BudgetGoal | Stores monthly budget total and category breakdown for a user. |
| AiChatUsage | Tracks assistant usage entries. |

## 9. ER Diagram

```mermaid
erDiagram
    USERS ||--o{ GROUP_MEMBERS : joins
    GROUPS_TABLE ||--o{ GROUP_MEMBERS : has
    USERS ||--o{ GROUP_INVITES : sends
    GROUPS_TABLE ||--o{ GROUP_INVITES : has
    USERS ||--o{ EXPENSES : pays
    GROUPS_TABLE ||--o{ EXPENSES : contains
    EXPENSES ||--o{ EXPENSE_SPLITS : divides_into
    USERS ||--o{ EXPENSE_SPLITS : owes
    EXPENSES ||--o| VOTES : may_require
    GROUPS_TABLE ||--o{ VOTES : has
    USERS ||--o{ VOTES : requests
    VOTES ||--o{ VOTE_DECISIONS : records
    USERS ||--o{ VOTE_DECISIONS : casts
    EXPENSES ||--o{ SETTLEMENTS : settled_by
    USERS ||--o{ SETTLEMENTS : pays
    USERS ||--o{ SETTLEMENTS : receives
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--|| USER_SETTINGS : owns
    GROUPS_TABLE ||--o{ CHALLENGES : has
    USERS ||--o{ CHALLENGES : creates
    CHALLENGES ||--o{ CHALLENGE_CONTRIBUTIONS : receives
    USERS ||--o{ CHALLENGE_CONTRIBUTIONS : contributes
    USERS ||--o{ BUDGET_GOALS : sets
    USERS ||--o{ AI_CHAT_USAGE : consumes

    USERS {
      text id PK
      text name
      text email UK
      text password
      text initials
      text avatar_color
      text avatar_emoji
      text created_at
    }

    GROUPS_TABLE {
      text id PK
      text name
      text type
      text emoji
      real threshold
      text owner_id
      text description
      text created_at
    }

    GROUP_MEMBERS {
      text group_id PK
      text user_id PK
      text role
      text joined_at
    }

    GROUP_INVITES {
      text id PK
      text group_id
      text email
      text invited_by
      text status
      text created_at
      text responded_at
    }

    EXPENSES {
      text id PK
      text group_id
      text description
      real amount
      text category
      text paid_by
      text split_method
      text expense_date
      text receipt_url
      text vote_id
      text created_at
    }

    EXPENSE_SPLITS {
      text expense_id PK
      text user_id PK
      real amount
    }

    VOTES {
      text id PK
      text group_id
      text requested_by
      text description
      real amount
      text category
      text reason
      text status
      text created_at
      text resolved_at
    }

    VOTE_DECISIONS {
      text vote_id PK
      text user_id PK
      text decision
      text decided_at
    }

    SETTLEMENTS {
      text id PK
      text group_id
      text expense_id
      text from_user
      text to_user
      real amount
      text method
      text status
      text created_at
    }

    CHALLENGES {
      text id PK
      text group_id
      text created_by
      text name
      real goal
      real current
      text challenge_type
      text start_date
      text end_date
    }

    BUDGET_GOALS {
      text id PK
      text user_id
      text month
      real total
      text breakdown
    }
```

## 10. Business Rules

| ID | Rule |
| --- | --- |
| BR-01 | A user must be authenticated to access all routes except health, register, and login. |
| BR-02 | A user can only see group data for groups where they are a member. |
| BR-03 | A group owner cannot leave their own group; they must delete the group or transfer ownership outside current scope. |
| BR-04 | Pending group invites are matched by invite email and user email. |
| BR-05 | Expenses above a positive group threshold create a vote. |
| BR-06 | Approved vote requires yes decisions from all group members. |
| BR-07 | A single no vote declines a pending expense vote. |
| BR-08 | Pending or declined vote-linked expenses do not count toward balances. |
| BR-09 | Expense splits are rounded to cents, with final split adjusted for rounding remainder. |
| BR-10 | Settlements cannot exceed the remaining amount owed for an expense. |
| BR-11 | Receipt uploads must be recognized image types and fit configured size limits. |
| BR-12 | AI assistant actions must be explicitly confirmed before they mutate workspace data. |

## 11. Requirement-to-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| FR-01 | UC-01 |
| FR-02 | UC-02 |
| FR-03 | UC-02, UC-03 |
| FR-04 | UC-04 |
| FR-05 | UC-04 |
| FR-06 | UC-04, UC-05 |
| FR-07 | UC-05 |
| FR-08 | UC-06 |
| FR-09 | UC-07 |
| FR-10 | UC-06, UC-09 |
| FR-11 | UC-09 |
| FR-12 | UC-08 |
| FR-13 | UC-03, UC-06, UC-11 |
| FR-14 | UC-11 |
| FR-15 | UC-10 |
| FR-16 | UC-04 |
