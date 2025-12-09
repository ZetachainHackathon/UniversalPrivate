# ✅ Next.js + Tailwind CSS + shadcn/ui 配置完成！

## 🎉 已完成的工作

你的 monorepo 已经完整配置好 Next.js、Tailwind CSS 和 shadcn/ui 的所有必要设置。

### ✅ 已安装的依赖

#### `apps/web` (Next.js 应用)
- tailwindcss
- postcss
- autoprefixer

#### `packages/ui` (共享组件库)
- tailwindcss
- postcss
- autoprefixer
- @radix-ui/react-slot
- class-variance-authority
- clsx
- tailwind-merge
- tailwindcss-animate
- lucide-react

### ✅ 创建/更新的文件

#### 配置文件
- ✅ `apps/web/tailwind.config.ts` - Tailwind 配置
- ✅ `apps/web/postcss.config.js` - PostCSS 配置
- ✅ `apps/web/tsconfig.json` - 添加了路径别名
- ✅ `packages/ui/tailwind.config.ts` - Tailwind 配置
- ✅ `packages/ui/postcss.config.js` - PostCSS 配置
- ✅ `packages/ui/tsconfig.json` - 添加了路径别名
- ✅ `packages/ui/components.json` - shadcn/ui 配置

#### 样式文件
- ✅ `apps/web/app/globals.css` - 更新为 shadcn/ui 主题变量
- ✅ `packages/ui/src/globals.css` - shadcn/ui 样式

#### 组件文件
- ✅ `packages/ui/src/button.tsx` - 完整的 shadcn/ui Button
- ✅ `packages/ui/src/card.tsx` - 完整的 shadcn/ui Card
- ✅ `packages/ui/src/lib/utils.ts` - cn() 工具函数

#### Package.json
- ✅ `apps/web/package.json` - 添加了 Tailwind 依赖
- ✅ `packages/ui/package.json` - 添加了所有 shadcn/ui 依赖和正确的导出配置

## 🚀 下一步操作

### 1. 安装依赖（必须！）

在 `frontend` 目录下运行：

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

访问: http://localhost:3000

## 📝 使用示例

在 `apps/web/app/page.tsx` 中使用组件：

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
          <CardTitle>欢迎使用</CardTitle>
          <CardDescription>
            您的 Next.js + Tailwind + shadcn/ui 已配置完成
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button>主要按钮</Button>
          <Button variant="outline">次要按钮</Button>
          <Button variant="ghost">Ghost 按钮</Button>
        </CardContent>
      </Card>
    </main>
  );
}
```

## 🎨 添加更多 shadcn/ui 组件

```bash
cd packages/ui
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
npx shadcn@latest add form
```

**重要：** 添加新组件后，记得在 `packages/ui/package.json` 的 `exports` 中添加：

```json
{
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx",
    "./dialog": "./src/components/ui/dialog.tsx",  // 新增
    "./input": "./src/components/ui/input.tsx"     // 新增
  }
}
```

## 🎨 自定义主题颜色

编辑 `apps/web/app/globals.css` 或 `packages/ui/src/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;      /* 主色调 */
  --secondary: 210 40% 96.1%;        /* 次要色 */
  --accent: 210 40% 96.1%;           /* 强调色 */
  --destructive: 0 84.2% 60.2%;      /* 警告/删除色 */
  --radius: 0.5rem;                   /* 圆角大小 */
}
```

## 📁 项目结构

```
frontend/
├── apps/
│   └── web/                         ✅ Next.js 应用
│       ├── app/
│       │   ├── globals.css          ✅ Tailwind + shadcn/ui 样式
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── tailwind.config.ts       ✅ Tailwind 配置
│       ├── postcss.config.js        ✅ PostCSS 配置
│       └── package.json             ✅ 包含 Tailwind 依赖
│
└── packages/
    └── ui/                          ✅ 共享组件库
        ├── src/
        │   ├── button.tsx           ✅ shadcn/ui Button
        │   ├── card.tsx             ✅ shadcn/ui Card
        │   ├── globals.css          ✅ shadcn/ui 样式
        │   └── lib/
        │       └── utils.ts         ✅ cn() 工具函数
        ├── components.json          ✅ shadcn/ui 配置
        ├── tailwind.config.ts       ✅ Tailwind 配置
        ├── postcss.config.js        ✅ PostCSS 配置
        └── package.json             ✅ 所有必要依赖
```

## 🛠️ 可用的脚本

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行 ESLint
pnpm lint

# 格式化代码
pnpm format

# 类型检查
pnpm check-types
```

## 📚 相关文档

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Turborepo 文档](https://turbo.build/repo/docs)

## 💡 提示

1. 所有 shadcn/ui 组件都应该添加到 `packages/ui` 包中
2. 从 `@repo/ui/[component]` 导入组件使用
3. 记得在添加新组件后更新 `packages/ui/package.json` 的 exports
4. 使用 `cn()` 函数合并 Tailwind 类名

## 🐛 遇到问题？

### Tailwind 样式不生效
- 确保已运行 `pnpm install`
- 确保在 `layout.tsx` 中导入了 `globals.css`
- 检查 `tailwind.config.ts` 的 `content` 路径配置

### 组件导入错误
- 检查 `packages/ui/package.json` 的 `exports` 字段
- 确保组件路径正确

### TypeScript 路径错误
- 确保 `tsconfig.json` 中的 `paths` 配置正确
- 重启 VS Code TypeScript 服务器

---

**配置完成！** 现在可以开始构建你的应用了 🎉
