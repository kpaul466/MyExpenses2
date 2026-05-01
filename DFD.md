# Data Flow Diagrams (DFD)

## Level 0 Context Diagram

```mermaid
graph TD
    User([User]) <-->|Input Transactions, Settings, Planner Items| App[Expense Manager App]
    App <-->|UI Display, Notifications| User
    App <-->|OAuth Tokens, Backup JSON| GoogleDrive[(Google Drive API)]
```

## Level 1 Data Flow Diagram

```mermaid
graph TD
    User([User]) -->|Provide PIN| Auth[1. Authentication & Security]
    User -->|Create, Edit, Delete| TxnMgr[2. Transaction Management]
    User -->|Manage Lists| PlannerMgr[3. Planner Management]
    
    Auth -->|Unlock UI| AppUI[App User Interface]
    
    TxnMgr -->|Write/Read| LocalDB[(Local Storage DB)]
    PlannerMgr -->|Write/Read| LocalDB
    
    User -->|Trigger Sync| SyncMgr[4. Cloud Sync Management]
    LocalDB -->|Full State JSON| SyncMgr
    SyncMgr -->|Merge State JSON| LocalDB
    SyncMgr <-->|Upload/Download| GoogleDrive[(Google Drive AppData)]
```

## Explanation of Data Stores
- **Local Storage DB:** The primary source of truth for the current device. It operates 100% offline.
- **Google Drive AppData:** A hidden cloud container specific to the user's Google Account. Used as a remote backup and sync bridge between multiple devices.
