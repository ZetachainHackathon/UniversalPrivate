# Universal Private Frontend Setup

## 🎉 Setup Complete

This monorepo is fully configured with Next.js, Tailwind CSS, and shadcn/ui.

### ✅ Installed Dependencies

#### `apps/web` (Next.js Application)
- tailwindcss
- postcss
- autoprefixer

#### `packages/ui` (Shared Component Library)
- tailwindcss
- postcss
- autoprefixer
- @radix-ui/react-slot
- class-variance-authority
- clsx
- tailwind-merge
- tailwindcss-animate
- lucide-react

### ✅ Created/Updated Files

#### Configuration Files
- ✅ `apps/web/tailwind.config.ts` - Tailwind Config
- ✅ `apps/web/postcss.config.js` - PostCSS Config
- ✅ `apps/web/tsconfig.json` - Path Aliases
- ✅ `packages/ui/tailwind.config.ts` - Tailwind Config
- ✅ `packages/ui/postcss.config.js` - PostCSS Config
- ✅ `packages/ui/tsconfig.json` - Path Aliases
- ✅ `packages/ui/components.json` - shadcn/ui Config

#### Style Files
- ✅ `apps/web/app/globals.css` - Updated with shadcn/ui theme variables
- ✅ `packages/ui/src/globals.css` - shadcn/ui styles

#### Component Files
- ✅ `packages/ui/src/button.tsx` - Complete shadcn/ui Button
- ✅ `packages/ui/src/card.tsx` - Complete shadcn/ui Card
- ✅ `packages/ui/src/lib/utils.ts` - cn() utility

#### Package.json
- ✅ `apps/web/package.json` - Tailwind dependencies added
- ✅ `packages/ui/package.json` - All shadcn/ui dependencies and exports added

## 🚀 Next Steps

### 1. Install Dependencies (Mandatory!)

Run inside `frontend` directory:

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

App available at: http://localhost:3000

## 📝 Usage Example

Using components in `apps/web/app/page.tsx`:

```tsx
import { Button } from "@repo/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@repo/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Your Next.js + Tailwind + shadcn/ui is ready
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

## 🎨 Adding More shadcn/ui Components

```bash
cd packages/ui
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
npx shadcn@latest add form
```

**IMPORTANT:** After adding a new component, remember to update `exports` in `packages/ui/package.json`:

```json
{
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx",
    "./dialog": "./src/components/ui/dialog.tsx",  // New
    "./input": "./src/components/ui/input.tsx"     // New
  }
}
```

## 🎨 Customizing Theme

Edit CSS variables in `apps/web/app/globals.css` or `packages/ui/src/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;      /* Primary Color */
  --secondary: 210 40% 96.1%;        /* Secondary Color */
  --accent: 210 40% 96.1%;           /* Accent Color */
  --destructive: 0 84.2% 60.2%;      /* Warning/Error Color */
  --radius: 0.5rem;                   /* Radius */
}
```

## 📁 Project Structure

```
frontend/
├── apps/
│   └── web/                         ✅ Next.js App
│       ├── app/
│       │   ├── globals.css          ✅ Tailwind + shadcn/ui styles
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── tailwind.config.ts       ✅ Tailwind Config
│       ├── postcss.config.js        ✅ PostCSS Config
│       └── package.json             ✅ Tailwind Deps
│
└── packages/
    └── ui/                          ✅ Shared UI Library
        ├── src/
        │   ├── button.tsx           ✅ shadcn/ui Button
        │   ├── card.tsx             ✅ shadcn/ui Card
        │   ├── globals.css          ✅ shadcn/ui styles
        │   └── lib/
        │       └── utils.ts         ✅ cn() utility
        ├── components.json          ✅ shadcn/ui Config
        ├── tailwind.config.ts       ✅ Tailwind Config
        ├── postcss.config.js        ✅ PostCSS Config
        └── package.json             ✅ All necessary deps
```

## 🛠️ Available Scripts

```bash
# Start Dev Server
pnpm dev

# Build Production
pnpm build

# Run ESLint
pnpm lint

# Format Code
pnpm format

# Type Check
pnpm check-types

# Run E2E Tests (Playwright)
cd apps/web
npx playwright test
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## 💡 Tips

1. All shadcn/ui components should be added to `packages/ui`.
2. Import components from `@repo/ui/[component]`.
3. Remember to update `exports` in `packages/ui/package.json` after adding new components.
4. Use `cn()` utility to merge Tailwind classes.

## 🐛 Troubleshooting

### Tailwind styles not working
- Ensure `pnpm install` has been run.
- Ensure `globals.css` is imported in `layout.tsx`.
- Check `content` paths in `tailwind.config.ts`.

### Component import errors
- Check `packages/ui/package.json` `exports` field.
- Ensure component paths are correct.

### TypeScript path errors
- Ensure `paths` config in `tsconfig.json` is correct.
- Restart VS Code TypeScript Server.

---

**Setup Complete!** You can now start building your app. 🎉
