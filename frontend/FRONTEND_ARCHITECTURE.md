# 前端架構文檔 (Frontend Architecture Documentation)

本文檔詳細說明了 Universal Private (Hackathon Edition) 的前端架構設計。

## 1. 架構總覽 (Architecture Overview)

本專案採用 **模組化 (Modular)** 與 **關注點分離 (Separation of Concerns)** 的設計原則，旨在解決複雜的跨鏈隱私交易邏輯。

整體架構分為四層：

1.  **View Layer (UI)**: 純展示組件，負責渲染頁面。
2.  **Container Layer (Page)**: 負責組合組件與連接業務邏輯。
3.  **Logic Layer (Hooks)**: 封裝所有業務邏輯、副作用與狀態計算。
4.  **Infrastructure Layer (Config/Lib)**: 底層配置、SDK 封裝與工具函數。

---

## 2. 目錄結構 (Directory Structure)

```
apps/web/
├── app/
│   └── cross-chain/         # 核心業務頁面
│       └── page.tsx         # 容器組件 (Container)
├── components/
│   ├── cross-chain/         # 業務專用 UI 組件
│   │   ├── header.tsx       # 頂部導航與錢包狀態
│   │   ├── shield-form.tsx  # 入金表單
│   │   └── transfer-form.tsx# 轉帳表單
│   └── providers/           # 全局 Context Providers
│       ├── wallet-provider.tsx # EVM 錢包狀態
│       └── railgun-provider.tsx# Railgun 隱私引擎狀態
├── config/
│   └── env.ts               # 集中式環境配置
├── hooks/                   # 自定義 Hooks
│   ├── use-shield-tx.ts     # Shield 交易邏輯
│   ├── use-transfer-tx.ts   # Transfer 交易邏輯
│   ├── use-railgun-engine.ts# 引擎初始化邏輯
│   └── ...
└── lib/
    └── railgun/             # Railgun SDK 封裝
```

---

## 3. 核心設計模式 (Core Design Patterns)

### A. 交易邏輯 Hook 化
原本複雜的交易流程被提取為獨立的 Custom Hooks：
*   `useShieldTransaction`: 處理審批、Shield 合約交互、網路切換。
*   `useTransferTransaction`: 處理 Zero-Knowledge Proof 生成、Relayer 交互、跨鏈調用。

**優點**:
*   `page.tsx` 大幅瘦身 (從 500+ 行降至 200 行)。
*   邏輯可復用且易於測試。

### B. 狀態管理 (State Management)
*   **Context API**: 用於全局狀態 (如 `useWallet`, `useRailgun`)，避免 Prop Drilling。
*   **Local State**: 用於表單輸入 (如 `amount`, `recipient`)，保持組件獨立性。
*   **Derived State**: 透過 Hooks 計算得出 (如 `status`, `isLoading`)。

### C. 配置中心化 (Centralized Configuration)
所有敏感配置 (RPC, Chain ID, Contract Addresses) 統一管理於 `config/env.ts`。
*   **Type Safety**: 防止拼寫錯誤。
*   **Environment Aware**: 易於切換 Testnet/Mainnet。

---

## 4. 關鍵組件說明 (Key Components)

### `CrossChainPage` (Container)
*   **職責**: 唯一的 "聰明組件"。
*   **行為**:
    1.  調用 `useWallet` 初始化 EVM 連接。
    2.  調用 `useRailgun` 初始化隱私引擊。
    3.  將狀態與處理函數傳遞給子組件 (`ShieldForm` 等)。

### `ShieldForm` / `TransferForm` (Presentational)
*   **職責**: "笨組件"，只負責顯示。
*   **特性**: 接收 Props，不包含任何業務邏輯或副作用。

---

## 5. 未來改進方向 (Future Improvements)

1.  **錯誤處理**: 引入 Global Toast 系統取代 `alert()`。
2.  **TypeScript**: 補全 `railgun-community` SDK 的類型定義，消除 `any`。
3.  **Testing**: 為 Hooks 添加單元測試。

---
*Document Generated on: 2025-12-14*
