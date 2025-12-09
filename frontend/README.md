# Universal Private Frontend

Next.js monorepo with Tailwind CSS and shadcn/ui configured.

## 🎉 Setup Complete

This monorepo is now fully configured with:
- ✅ Next.js 16
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ TypeScript path aliases
- ✅ Turborepo for build optimization

## 🚀 Quick Start

### 1. Install Dependencies

**Important:** Run this first!

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

Web app will be available at: http://localhost:3000

## 📁 Project Structure

```
frontend/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/
│       │   ├── globals.css     # ✅ Tailwind + shadcn/ui styles
│       │   └── page.tsx
│       ├── tailwind.config.ts  # ✅ Tailwind configuration
│       └── postcss.config.js   # ✅ PostCSS configuration
│
└── packages/
    ├── ui/                     # Shared component library
    │   ├── src/
    │   │   ├── button.tsx      # ✅ shadcn/ui Button
    │   │   ├── card.tsx        # ✅ shadcn/ui Card
    │   │   ├── globals.css     # ✅ shadcn/ui styles
    │   │   └── lib/
    │   │       └── utils.ts    # ✅ cn() utility
    │   ├── components.json     # ✅ shadcn/ui config
    │   └── tailwind.config.ts
    ├── eslint-config/
    └── typescript-config/
```

## 🎨 Using Components

Import and use shadcn/ui components in your app:

```tsx
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";

export default function Page() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Your app is ready</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Click me</Button>
          <Button variant="outline" className="ml-2">Secondary</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 📦 Adding More shadcn/ui Components

```bash
cd packages/ui
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add dropdown-menu
```

Then add the new component to `packages/ui/package.json` exports:

```json
"exports": {
  "./button": "./src/button.tsx",
  "./dialog": "./src/dialog.tsx",  // Add this
  "./input": "./src/input.tsx"     // Add this
}
```

## 🎨 Customizing Theme

Edit CSS variables in `apps/web/app/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* More colors... */
}
```

## 🛠️ Available Scripts

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

### Frontend Stack
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

### Turborepo
- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
