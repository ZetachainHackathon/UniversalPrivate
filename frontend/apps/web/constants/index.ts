// 应用常量
export const APP_NAME = "Universal Private";
export const APP_DESCRIPTION = "Next.js + Tailwind CSS + shadcn/ui";

// API 端点
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// 路由
export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  // 添加更多路由...
} as const;
