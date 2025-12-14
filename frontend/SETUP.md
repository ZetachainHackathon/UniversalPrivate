# Next.js + Tailwind CSS + shadcn/ui Monorepo Setup

## ✅ 完成的配置

你的 monorepo 已经完整配置了 Next.js、Tailwind CSS 和 shadcn/ui！

### 已安装的依赖

#### Web App (`frontend/apps/web`)
- ✅ Tailwind CSS
- ✅ PostCSS
- ✅ Autoprefixer
- ✅ shadcn/ui 核心依赖:
  - `@radix-ui/react-slot`
  - `class-variance-authority`
  - `clsx`
  - `tailwind-merge`
  - `tailwindcss-animate`
  - `lucide-react`

#### UI Package (`frontend/packages/ui`)
- ✅ Tailwind CSS
- ✅ PostCSS
- ✅ Autoprefixer
- ✅ shadcn/ui 核心依赖:
  - `@radix-ui/react-slot`
  - `class-variance-authority`
  - `clsx`
  - `tailwind-merge`
  - `tailwindcss-animate`
  - `lucide-react`

### 创建的配置文件

1. **Tailwind 配置**
   - `frontend/apps/web/tailwind.config.ts`
   - `frontend/packages/ui/tailwind.config.ts`

2. **PostCSS 配置**
   - `frontend/apps/web/postcss.config.js`
   - `frontend/packages/ui/postcss.config.js`

3. **样式文件**
   - `frontend/apps/web/app/globals.css` (已更新为 shadcn/ui 样式)
   - `frontend/packages/ui/src/globals.css` (新建)

4. **工具函数**
   - `frontend/packages/ui/src/lib/utils.ts` (cn 函数)

5. **TypeScript 配置**
   - 已配置路径别名 `@/*` 在两个包中

6. **shadcn/ui 组件**
   - `Button` 组件 (已更新为完整的 shadcn/ui 版本)
   - `Card` 组件 (已更新为完整的 shadcn/ui 版本)

## 🚀 下一步

### 1. 安装依赖

```bash
cd frontend
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

### 3. 添加更多 shadcn/ui 组件

在 `frontend/packages/ui` 目录下运行:

```bash
npx shadcn@latest add [component-name]
```

例如:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add form
```

### 4. 在 Web App 中使用组件

```tsx
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";

export default function Page() {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Hello World</CardTitle>
          <CardDescription>This is a shadcn/ui card</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Click me</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 📁 项目结构

```
frontend/
├── apps/
│   └── web/                    # Next.js 应用
│       ├── app/
│       │   ├── globals.css     # 全局样式 (包含 shadcn/ui 主题)
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── tailwind.config.ts  # Tailwind 配置
│       ├── postcss.config.js   # PostCSS 配置
│       └── tsconfig.json       # TypeScript 配置
│
└── packages/
    └── ui/                     # 共享 UI 组件库
        ├── src/
        │   ├── button.tsx      # shadcn/ui Button
        │   ├── card.tsx        # shadcn/ui Card
        │   ├── globals.css     # shadcn/ui 样式
        │   └── lib/
        │       └── utils.ts    # cn() 工具函数
        ├── components.json     # shadcn/ui 配置
        ├── tailwind.config.ts
        ├── postcss.config.js
        └── tsconfig.json
```

## 🎨 主题定制

编辑 `globals.css` 中的 CSS 变量来自定义颜色:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  /* ... 更多颜色 */
}
```

## 📚 资源

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Turborepo 文档](https://turbo.build/repo/docs)
