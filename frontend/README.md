# Universal Private Frontend

Next.js monorepo with Tailwind CSS and shadcn/ui configured for Privacy-Preserving Applications.

## 📚 Documentation

Detailed documentation for setup and architecture can be found here:

*   **[Installation Guide](INSTALLATION.md)**: Detailed setup steps, dependency verification, and troubleshooting.
*   **[Architecture Guide](ARCHITECTURE.md)**: Deep dive into the system design, core privacy flows, and directory structure.

## 🚀 Quick Start

### 1. Install Dependencies

**Important:** Run this first to install all dependencies for the monorepo.

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

The web application will be available at: http://localhost:3000

## 📁 Project Structure

```bash
frontend/
├── apps/
│   └── web/                    # Next.js Application (Privacy Interface)
│       ├── app/
│       ├── components/         # UI Components
│       ├── hooks/              # Business Logic & Privacy Hooks
│       └── lib/                # Core Railgun Logic
│
└── packages/
    ├── ui/                     # Shared Component Library (shadcn/ui)
    ├── eslint-config/          # Shared Lint Rules
    └── typescript-config/      # Shared TS Configuration
```

## 🛠️ Build & Test

### Build

To build all apps and packages:

```bash
pnpm build
```

### Test

We use Vitest for unit testing. **Note:** Run tests from the root using filters.

```bash
# Run all tests
pnpm test

# Run only web app tests
pnpm --filter web test
```

## 📄 License

This project is licensed under the MIT License.
