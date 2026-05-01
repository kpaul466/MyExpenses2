# Security and Architecture Audit Report
## App Name: Expense Manager

### 1. Overview
Expense Manager is a client-side (SPA) progressive web application (PWA) designed to track personal expenses, manage budgets, and maintain shopping lists. The application operates primarily offline using `localStorage` and provides optional cloud synchronization via Google Drive AppData folder.

### 2. Architecture & Tech Stack
- **Frontend Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Lucide React for icons
- **State Management:** React Hooks + Custom LocalStorage-based DB (`src/db.ts`)
- **Authentication & Sync:** Google OAuth 2.0 (implicit grant/token flow) restricting access to `drive.appdata`, `userinfo.email`, and `userinfo.profile`.
- **PWA Capabilities:** Vite PWA Plugin for offline support and device installation.

### 3. Security Audit

#### 3.1 Data Storing & Privacy
- **Local Storage:** All app data (transactions, categories, people, planner items) is stored in browser `localStorage`. 
  - *Risk:* Data is accessible to anyone with physical access to the unlocked device or browser dev tools.
  - *Mitigation:* The application features a "Privacy Mode" (blurred balances) and a PIN-based lock screen. Note that the PIN is stored in plaintext/hashed locally, so it deters casual snooping but isn't cryptographically secure against local exploitation.
- **Cloud Storage:** Google Drive integration uses the `drive.appdata` scope.
  - *Benefit:* Data is stored in a hidden application data folder that is only accessible by this specific application, protecting user privacy and preventing accidental deletion by the user in the Drive UI.
  - *Mitigation:* The app synchronizes JSON blobs of the state.

#### 3.2 Authentication & Authorization
- **OAuth Flow:** Uses `@react-oauth/google` for secure token generation. 
- **Token Storage:** OAuth access tokens are stored in `localStorage` with a strict expiry check. The system securely clears tokens upon 401/403 responses.
- **Data Isolation:** Since the app relies solely on personal Google Drive storage, there is no centralized backend handling multi-tenant data, eliminating server-side data leaks.

#### 3.3 Network Security
- Application is served over HTTPS (enforced by the hosting environment).
- No sensitive external API calls other than Google APIs over TLS.

### 4. Code Quality & Performance Audit
- **Offline First:** The app successfully implements offline-first capabilities.
- **State Merging:** A robust merging algorithm exists (`localDB.mergeFullState`) to handle multi-device synchronization without excessive data loss, resolving arrays by ID and sorting by timestamp.
- **Responsive UI:** Adapts to mobile and desktop via CSS flexbox and Tailwind utility classes.

### 5. Recommendations
- **IndexedDB Migration:** Move from `localStorage` to `IndexedDB` (e.g., using localForage or Dexie.js) to support larger datasets and better async performance.
- **End-to-End Encryption:** Implement client-side encryption before uploading to Google Drive to ensure Google cannot read the raw JSON backups.
