import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Universal Private
          </h1>
          <p className="text-muted-foreground">
            Next.js + Tailwind CSS + shadcn/ui
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>欢迎使用</CardTitle>
            <CardDescription>
              您的应用已配置完成，可以开始开发了
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              这是一个使用 Turborepo 的 monorepo 项目，包含 Next.js、Tailwind CSS 和 shadcn/ui 组件。
            </p>
            <div className="flex gap-2">
              <Button>主要按钮</Button>
              <Button variant="outline">次要按钮</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">功能特性</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Tailwind CSS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>shadcn/ui 组件</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>TypeScript</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">开始使用</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>编辑 <code className="text-xs bg-muted px-1 py-0.5 rounded">app/page.tsx</code> 来修改此页面</p>
              <p>在 <code className="text-xs bg-muted px-1 py-0.5 rounded">packages/ui</code> 中添加组件</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
