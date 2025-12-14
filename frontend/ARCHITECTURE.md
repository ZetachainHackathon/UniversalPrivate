# Universal Private (Frontend) - Architecture Guide 🏗️

Welcome to the architectural documentation for **Universal Private Frontend**. This guide is designed to provide a comprehensive understanding of the system, ranging from high-level design decisions to low-level implementation details.

---

## 1. High-Level Overview (Macro Architecture)

The project is built as a **Monorepo** using **Turborepo** to manage multiple workspaces efficiently. It focuses on providing a privacy-preserving interface for blockchain interactions using the **Railgun Privacy System**.

### 1.1 Technology Stack

*   **Monorepo Manager**: [Turborepo](https://turbo.build/)
*   **Package Manager**: [pnpm](https://pnpm.io/)
*   **Frontend Framework**: [Next.js 16](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Privacy Engine**: [@railgun-community/wallet](https://www.npmjs.com/package/@railgun-community/wallet) (Zero-Knowledge Proofs)
*   **Blockchain Interaction**: [Ethers.js v6](https://docs.ethers.org/)
*   **UI/Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [Shadcn](https://ui.shadcn.com/)
*   **Testing**: [Vitest](https://vitest.dev/)

### 1.2 Core Principals

1.  **Privacy First**: All core transactions (Shield, Transfer) are processed client-side to generate Zero-Knowledge Proofs. No sensitive keys leave the browser.
2.  **Logic/UI Separation**: Business logic is encapsulated in Custom Hooks (`hooks/`), keeping UI components (`components/`) pure and focused on presentation.
3.  **Config Driven**: Network parameters, Fees, and Contract addresses are centralized in `config/env.ts` to avoid magic numbers and simplify multi-chain support.

---

## 2. Directory Structure (Monorepo)

The codebase is organized into key workspaces:

```bash
root/
├── apps/
│   └── web/                 # Main Frontend Application (Next.js)
│       ├── app/             # App Router (Pages & Layouts)
│       ├── components/      # UI Components (Presentational)
│       ├── hooks/           # Business Logic (React Hooks)
│       ├── lib/             # Core Libraries (Railgun Wrapper, Storage, etc.)
│       └── config/          # Centralized Configuration
├── packages/
│   ├── ui/                  # Shared UI Library (Buttons, Dialogs, Toast)
│   ├── eslint-config/       # Shared Linting Rules
│   └── typescript-config/   # Shared TSConfigs
├── turbo.json               # Pipeline Configuration
└── package.json             # Root Scripts
```

---

## 3. Core Systems & Flows

### 3.1 Authentication & Wallet Management

The system employs a **Two-Tier Authentication** model:
1.  **EVM Wallet (Public)**: Connects via `useWallet` (e.g., MetaMask). Used for public interactions (like Approvals) and signing Shield requests.
2.  **Railgun Wallet (Private)**: Managed via `useRailgun`. Requires a password to derive the `Encryption Key`.
    *   **Session State**: The derived `Encryption Key` is stored in React Context (memory only) during the session. It is **never** persisted to LocalStorage for security.
    *   **Auth Guard**: Critical pages (e.g., `/cross-chain`) check for the existence of this key and redirect to login if missing.

### 3.2 Privacy Engine Lifecycle (`lib/railgun`)

The Railgun Engine is a heavy WASM-based background process.
*   **Initialization**: Happens lazily or on app boot via `useRailgunEngine`.
*   **Database**: Uses `level-js` (IndexedDB) to store the Merkle Tree sync status client-side.
*   **Transactions**:
    *   **Shield**: `apps/web/lib/railgun/shield.ts` - Converts Public ERC20 -> Private Note.
    *   **Transfer**: `apps/web/lib/railgun/transfer.ts` - Private Transfer (0zk -> 0zk).
    *   **Cross-Chain**: `apps/web/lib/railgun/cross-chain-transfer.ts` - Complex flow involving Unshield + Contract Calls.

### 3.3 State Management Pattern

We avoid heavy global state libraries (Redux/Zustand) in favor of **Context + Hooks**:
*   **Global**: `RailgunProvider`, `WalletProvider`, `ConfirmDialogProvider`.
*   **Local**: Form state (React `useState`).
*   **Feedback**: Toast notifications (`sonner`) for async operation status.

---

## 4. UI Architecture

The UI is modularized into `packages/ui` for potential reuse.
*   **Design System**: Brutalist/Minimalist theme.
*   **Components**: Built on top of Radix UI primitives for accessibility.
*   **Modification**:
    1.  Edit reusable primitives in `packages/ui/src/components`.
    2.  Edit feature-specific components in `apps/web/components`.

---

## 5. Developer Guide

### 5.1 Prerequisites
*   **Node.js**: >= 18
*   **pnpm**: >= 9 (Recommended package manager)
*   **Git**

### 5.2 Installation

```bash
# 1. Clone
git clone <repo-url>
cd UniversalPrivate

# 2. Install dependencies (Root)
pnpm install

# 3. Download Railgun Artifacts (Post-install script should handle this, but if manually needed)
# Usually handled by `patch-package` or `pnpm copy-artifacts` inside apps/web
```

### 5.3 Running Locally

```bash
# Run the development server (starts Next.js on localhost:3000)
pnpm dev
```

### 5.4 Testing

We use **Vitest** for unit testing, covering core logic (esp. Cross-Chain calculations).

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm --filter web test -- lib/railgun/cross-chain-check.test.ts
```

*Note: Some tests require mocked `ethers` which is handled in `apps/web/__mocks__`.*

---

## 6. Deployment

The application is optimized for Vercel deployment but can be Dockerized.

### 6.1 Vercel Deployment
1.  **Build Command**: `pnpm build` (Root scope, triggers turbo build).
2.  **Output Directory**: `apps/web/.next` (Next.js default).
3.  **Environment Variables**: Verify `.env.example` mapping.
    *   `NEXT_PUBLIC_CHAIN_ID`
    *   `NEXT_PUBLIC_RPC_URL`

### 6.2 Manual Build

```bash
# Clean build
pnpm build

# Serve
cd apps/web
pnpm start
```

---

## 7. Future Roadmap & Scaling

1.  **Relayer Integration**: Currently, transactions are self-signed. Integrating a Relayer would allow gas-less private transactions (paying fee in tokens).
2.  **WASM Multi-threading**: Optimizing Proof Generation speed.
3.  **Mobile Support**: Responsive design improvements for mobile browsers.

---

*Last Updated: December 2025*
