# 项目架构说明

## 📁 packages/ui (共享 UI 组件库)

```
packages/ui/src/
├── components/          # UI 组件
│   ├── button.tsx
│   ├── card.tsx
│   ├── code.tsx
│   └── index.ts        # 统一导出
├── lib/                # 工具函数
│   ├── cn.ts           # className 合并工具
│   └── index.ts
└── globals.css         # 全局样式
```

**使用方式：**
```tsx
import { Button, Card } from "@repo/ui/components";
import { cn } from "@repo/ui/lib";
```

---

## 📁 apps/web (Next.js 应用)

```
apps/web/
├── app/                # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/         # 页面级组件
│   └── index.ts
├── lib/                # 工具函数
│   └── utils.ts
├── hooks/              # 自定义 Hooks
│   ├── useLocalStorage.ts
│   └── index.ts
├── types/              # TypeScript 类型定义
│   └── index.ts
└── constants/          # 常量配置
    └── index.ts
```

**路径别名：**
- `@/components/*` → `./components/*`
- `@/lib/*` → `./lib/*`
- `@/hooks/*` → `./hooks/*`
- `@/types/*` → `./types/*`
- `@/constants/*` → `./constants/*`

**使用示例：**
```tsx
import { useLocalStorage } from "@/hooks";
import { APP_NAME } from "@/constants";
import type { User } from "@/types";
import { formatDate } from "@/lib/utils";
```

---

## 🎯 开发指南

### 添加新的 UI 组件
1. 在 `packages/ui/src/components/` 创建组件
2. 在 `packages/ui/src/components/index.ts` 导出
3. 更新 `packages/ui/package.json` 的 exports

### 添加页面组件
在 `apps/web/components/` 创建组件，使用 `@/components` 导入

### 添加工具函数
在 `apps/web/lib/` 创建函数，使用 `@/lib` 导入

### 添加自定义 Hook
在 `apps/web/hooks/` 创建 Hook，使用 `@/hooks` 导入

### 添加类型定义
在 `apps/web/types/` 添加类型，使用 `@/types` 导入

### 添加常量
在 `apps/web/constants/` 添加常量，使用 `@/constants` 导入
