// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 👇 1. 引入我們的 Provider
import RailgunProvider from "@/components/providers/railgun-provider";
import WalletProvider from "@/components/providers/wallet-provider";
import { ConfirmDialogProvider } from "@/components/providers/confirm-dialog-provider";
import { Toaster } from "@repo/ui/components/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universal Private",
  description: "Cross-chain private transactions via Railgun",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 👇 2. 用 Provider 包住 children */}
        <RailgunProvider>
          <WalletProvider>
            <ConfirmDialogProvider>
              {children}
              <Toaster />
            </ConfirmDialogProvider>
          </WalletProvider>
        </RailgunProvider>
      </body>
    </html>
  );
}