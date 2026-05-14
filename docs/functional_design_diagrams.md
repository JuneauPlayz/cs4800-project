# SplitStack Functional Design Diagrams

Version: 1.0  
Date: May 12, 2026  
Related documents: `planning files/Project_Requirements_Specification (2).docx`, `planning files/SplitStack_Use_Cases (1) (3).docx`

## Overview

These diagrams support the requirements and use-case files with activity flows plus a domain/ER model for the implemented SplitStack system.

## Activity Diagram: Register and Log In

```mermaid
flowchart TD
  A["User opens SplitStack"] --> B{"Existing account?"}
  B -- "No" --> C["Enter name, email, password, optional avatar"]
  C --> D["Submit registration"]
  D --> E{"Backend validates email and password"}
  E -- "Invalid or duplicate" --> F["Show error"]
  F --> C
  E -- "Valid" --> G["Create user, settings, session token"]
  B -- "Yes" --> H["Enter email and password"]
  H --> I["Submit login"]
  I --> J{"Credentials valid?"}
  J -- "No" --> K["Show login error"]
  K --> H
  J -- "Yes" --> L["Return session token"]
  G --> M["Load workspace data"]
  L --> M
  M --> N["Show authenticated dashboard"]
```

## Activity Diagram: Create Group and Invite Members

```mermaid
flowchart TD
  A["Authenticated user opens Groups"] --> B["Enter group name, type, threshold, description"]
  B --> C["Add invite email addresses"]
  C --> D{"Form valid?"}
  D -- "No" --> E["Show validation error"]
  E --> B
  D -- "Yes" --> F["Create group"]
  F --> G["Add creator as owner/member"]
  G --> H["Create pending invites"]
  H --> I["Notify invited users when they log in"]
  I --> J{"Invite response"}
  J -- "Accept" --> K["Add invitee to group_members"]
  J -- "Decline" --> L["Mark invite declined"]
  K --> M["Group visible in invitee workspace"]
  L --> M
```

## Activity Diagram: Add Expense and Apply Voting Rule

```mermaid
flowchart TD
  A["Group member opens Add Expense"] --> B["Select group or personal tracking"]
  B --> C["Enter description, amount, category, date, split method"]
  C --> D{"Receipt attached?"}
  D -- "Yes" --> E["Upload receipt image"]
  E --> F["Save receipt URL"]
  D -- "No" --> G["Continue without receipt"]
  F --> H["Validate amount and splits"]
  G --> H
  H --> I{"Valid split?"}
  I -- "No" --> J["Show split validation error"]
  J --> C
  I -- "Yes" --> K{"Personal expense?"}
  K -- "Yes" --> L["Save personal expense and split"]
  K -- "No" --> M{"Amount exceeds group threshold?"}
  M -- "No" --> N["Save approved group expense"]
  M -- "Yes" --> O["Save expense with pending vote id"]
  O --> P["Create vote and notify group members"]
  P --> Q{"All members approve?"}
  Q -- "No vote yet" --> R["Expense excluded from balances"]
  Q -- "Any decline" --> S["Vote declined, expense excluded"]
  Q -- "Yes" --> T["Vote approved, expense included in balances"]
  L --> U["Refresh dashboard and analytics"]
  N --> U
  T --> U
```

## Activity Diagram: Record Settlement

```mermaid
flowchart TD
  A["User sees open amount owed"] --> B["Open payment/settlement action"]
  B --> C["Select or enter payment method"]
  C --> D["Submit payment record"]
  D --> E{"Backend validates membership and open amount"}
  E -- "Invalid" --> F["Show error"]
  E -- "Valid" --> G["Insert settlement row"]
  G --> H["Update expense payment status"]
  H --> I["Notify payer and payee"]
  I --> J["Refresh balances"]
```

## Activity Diagram: Receipt OCR-Assisted Expense Entry

```mermaid
flowchart TD
  A["User selects receipt image"] --> B["Client creates preview"]
  B --> C["OCR pipeline reads receipt text"]
  C --> D{"Text found?"}
  D -- "No" --> E["User manually enters amount/date"]
  D -- "Yes" --> F["Extract likely total and date"]
  F --> G{"Values confident?"}
  G -- "No" --> E
  G -- "Yes" --> H["Autofill amount and date"]
  H --> I["User reviews and edits fields"]
  E --> I
  I --> J["Submit expense with receipt image"]
  J --> K["Backend validates and stores receipt"]
```

## Activity Diagram: AI Assistant Confirmed Action

```mermaid
flowchart TD
  A["User asks assistant a question or requests an action"] --> B["Backend builds workspace summary"]
  B --> C{"Gemini API configured?"}
  C -- "Yes" --> D["Generate Gemini-backed reply"]
  C -- "No" --> E["Generate local fallback reply"]
  D --> F["Parse possible account action"]
  E --> F
  F --> G{"Action detected?"}
  G -- "No" --> H["Show assistant reply only"]
  G -- "Yes" --> I["Show proposed action confirmation"]
  I --> J{"User confirms?"}
  J -- "Cancel" --> K["No data is changed"]
  J -- "Confirm" --> L["Execute supported action"]
  L --> M["Refresh workspace data"]
```

## Domain ER Diagram

```mermaid
erDiagram
  users {
    TEXT id PK
    TEXT name
    TEXT email UK
    TEXT password
    TEXT initials
    TEXT avatar_color
    TEXT avatar_emoji
    TEXT created_at
  }

  groups_table {
    TEXT id PK
    TEXT name
    TEXT type
    TEXT emoji
    REAL threshold
    TEXT owner_id FK
    TEXT description
    TEXT created_at
  }

  group_members {
    TEXT group_id PK,FK
    TEXT user_id PK,FK
    TEXT role
    TEXT joined_at
  }

  group_invites {
    TEXT id PK
    TEXT group_id FK
    TEXT email
    TEXT invited_name
    TEXT role
    TEXT invited_by FK
    TEXT status
    TEXT created_at
    TEXT responded_at
  }

  expenses {
    TEXT id PK
    TEXT group_id FK
    TEXT description
    REAL amount
    TEXT category
    TEXT paid_by FK
    TEXT split_method
    TEXT expense_date
    TEXT merchant
    TEXT receipt_url
    TEXT reason
    TEXT vote_id FK
    TEXT created_at
  }

  expense_splits {
    TEXT expense_id PK,FK
    TEXT user_id PK,FK
    REAL amount
  }

  votes {
    TEXT id PK
    TEXT group_id FK
    TEXT requested_by FK
    TEXT description
    REAL amount
    TEXT category
    TEXT reason
    TEXT status
    TEXT created_at
    TEXT resolved_at
  }

  vote_decisions {
    TEXT vote_id PK,FK
    TEXT user_id PK,FK
    TEXT decision
    TEXT decided_at
  }

  settlements {
    TEXT id PK
    TEXT group_id FK
    TEXT expense_id FK
    TEXT from_user FK
    TEXT to_user FK
    REAL amount
    TEXT method
    TEXT note
    TEXT status
    TEXT completed_at
    TEXT created_at
  }

  challenges {
    TEXT id PK
    TEXT group_id FK
    TEXT created_by FK
    TEXT name
    TEXT description
    REAL goal
    REAL current
    TEXT unit
    TEXT color
    TEXT challenge_type
    TEXT start_date
    TEXT end_date
    TEXT created_at
  }

  challenge_contributions {
    TEXT id PK
    TEXT challenge_id FK
    TEXT user_id FK
    REAL amount
    TEXT created_at
  }

  budget_goals {
    TEXT id PK
    TEXT user_id FK
    TEXT month
    REAL total
    TEXT breakdown
    TEXT created_at
    TEXT updated_at
  }

  notifications {
    TEXT id PK
    TEXT user_id FK
    TEXT type
    TEXT title
    TEXT body
    INTEGER unread
    TEXT created_at
  }

  user_settings {
    TEXT user_id PK,FK
    INTEGER email_votes
    INTEGER email_balance
    INTEGER push_settlements
    INTEGER ai_proactive
    TEXT profile_visibility
    TEXT activity_visibility
  }

  user_payout_profiles {
    TEXT user_id PK,FK
    TEXT zelle_handle
    TEXT venmo_handle
    TEXT cash_note
    TEXT preferred_method
    TEXT updated_at
  }

  ai_chat_usage {
    TEXT id PK
    TEXT user_id FK
    TEXT created_at
  }

  users ||--o{ group_members : joins
  groups_table ||--o{ group_members : has
  groups_table ||--o{ group_invites : sends
  users ||--o{ group_invites : invites
  users ||--o{ expenses : pays
  groups_table ||--o{ expenses : contains
  expenses ||--o{ expense_splits : splits
  users ||--o{ expense_splits : owes
  groups_table ||--o{ votes : requires
  users ||--o{ votes : requests
  votes ||--o{ vote_decisions : records
  users ||--o{ vote_decisions : casts
  expenses ||--o| votes : may_require
  expenses ||--o{ settlements : settles
  users ||--o{ settlements : pays_or_receives
  groups_table ||--o{ challenges : owns
  users ||--o{ challenges : creates
  challenges ||--o{ challenge_contributions : tracks
  users ||--o{ challenge_contributions : contributes
  users ||--o{ budget_goals : sets
  users ||--o{ notifications : receives
  users ||--|| user_settings : configures
  users ||--o| user_payout_profiles : configures
  users ||--o{ ai_chat_usage : consumes
```

## Domain Object Summary

| Object | Purpose |
| --- | --- |
| User | Account identity, profile, avatar, and authentication owner. |
| Group | Shared workspace with type, threshold, owner, and description. |
| GroupMember | Membership and role assignment for a user in a group. |
| GroupInvite | Pending or completed invitation to join a group. |
| Expense | Recorded purchase, personal cost, or shared group cost. |
| ExpenseSplit | Per-user amount owed for an expense. |
| Vote | Voting workflow for above-threshold expenses. |
| VoteDecision | A member's yes/no response to a vote. |
| Settlement | Recorded payment against an outstanding expense amount. |
| Challenge | Group savings/spending goal with progress. |
| ChallengeContribution | User contribution toward a challenge. |
| BudgetGoal | User monthly budget and category breakdown. |
| Notification | In-app event message for invites, votes, balances, and challenges. |
| UserSettings | Notification and privacy preferences. |
