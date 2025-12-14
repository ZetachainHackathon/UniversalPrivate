# Universal Private (Frontend) - 架構指南 🏗️

歡迎閱讀 **Universal Private Frontend** 的架構文檔。本指南旨在提供系統的全面理解，從高層設計決策到低層實作細節。

---

## 1. 高層總覽 (Macro Architecture)

本專案採用 **Monorepo** 架構，使用 **Turborepo** 高效管理多個工作區。核心目標是利用 **Railgun 隱私系統** 提供保護隱私的區塊鏈交互介面。

### 1.1 技術棧 (Technology Stack)

*   **Monorepo 管理**: [Turborepo](https://turbo.build/)
*   **套件管理**: [pnpm](https://pnpm.io/)
*   **前端框架**: [Next.js 16](https://nextjs.org/) (App Router)
*   **語言**: TypeScript
*   **隱私引擎**: [@railgun-community/wallet](https://www.npmjs.com/package/@railgun-community/wallet) (零知識證明生成)
*   **區塊鏈交互**: [Ethers.js v6](https://docs.ethers.org/)
*   **UI/樣式**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [Shadcn](https://ui.shadcn.com/)
*   **測試框架**: [Vitest](https://vitest.dev/)

### 1.2 核心原則 (Core Principals)

1.  **隱私優先 (Privacy First)**: 所有核心交易 (Shield, Transfer) 均在客戶端處理並生成零知識證明。敏感私鑰絕不離開瀏覽器端。
2.  **邏輯/UI 分離 (Logic/UI Separation)**: 業務邏輯封裝在 Custom Hooks (`hooks/`) 中，保持 UI 組件 (`components/`) 純淨且專注於展示。
3.  **配置驅動 (Config Driven)**: 網路參數、手續費和合約地址集中管理於 `config/env.ts`，避免 Magic Numbers 散落在代碼中，並簡化多鏈支援。

---

## 2. 目錄結構 (Directory Structure)

代碼庫組織如下：

```bash
root/
├── apps/
│   └── web/                 # 主前端應用 (Next.js)
│       ├── app/             # App Router (頁面與佈局)
│       ├── components/      # UI 組件 (展示層)
│       ├── hooks/           # 業務邏輯 (React Hooks)
│       ├── lib/             # 核心庫 (Railgun 封裝, Storage 等)
│       └── config/          # 集中式配置
├── packages/
│   ├── ui/                  # 共享 UI 庫 (按鈕, Dialog, Toast)
│   ├── eslint-config/       # 共享 Lint 規則
│   └── typescript-config/   # 共享 TSConfigs
├── turbo.json               # Pipeline 配置
└── package.json             # 根目錄腳本
```

---

## 3. 核心系統與流程 (Core Systems & Flows)

### 3.1 驗證與錢包管理 (Authentication & Wallet)

系統採用 **雙層驗證 (Two-Tier Authentication)** 模型：
1.  **EVM 錢包 (公開)**: 透過 `useWallet` 連接 (如 MetaMask)。用於公開交互 (如 Approve) 和簽署 Shield 請求。
2.  **Railgun 錢包 (隱私)**: 透過 `useRailgun` 管理。需要密碼來衍生 `Encryption Key`。
    *   **Session 狀態**: 衍生出的 `Encryption Key` 僅存儲在 React Context (記憶體) 中。為了安全起見，**絕不** 持久化到 LocalStorage。
    *   **Auth Guard**: 關鍵頁面 (如 `/cross-chain`) 會檢查此 Key 是否存在，若缺失則重定向至登入頁。

### 3.2 隱私引擎生命週期 (`lib/railgun`)

Railgun Engine 是一個較重的 WASM後台進程。
*   **初始化**: 在 App 啟動時透過 `useRailgunEngine` 懶加載。
*   **資料庫**: 使用 `level-js` (IndexedDB) 在客戶端存儲 Merkle Tree 同步狀態。
*   **核心交易**:
    *   **Shield**: `apps/web/lib/railgun/shield.ts` - 將公開 ERC20 轉換為隱私 Note。
    *   **Transfer**: `apps/web/lib/railgun/transfer.ts` - 隱私轉帳 (0zk -> 0zk)。
    *   **Cross-Chain**: `apps/web/lib/railgun/cross-chain-transfer.ts` - 複雜流程，涉及 Unshield + 跨合約調用。

### 3.3 狀態管理模式 (State Management)

我們避免使用重型的全局狀態庫 (Redux/Zustand)，而採用 **Context + Hooks**：
*   **全局**: `RailgunProvider`, `WalletProvider`, `ConfirmDialogProvider`.
*   **局部**: 表單狀態 (React `useState`).
*   **反饋**: 使用 `sonner` Toast 處理異步操作的狀態提示。

---

## 4. UI 架構 (UI Architecture)

UI 被模組化到 `packages/ui` 以便潛在的復用。
*   **設計系統**: 野獸派/極簡主義風格 (Brutalist/Minimalist)。
*   **組件**: 基於 Radix UI 原語構建，確保無障礙性 (Accessibility)。
*   **修改指南**:
    1.  修改可復用原語：`packages/ui/src/components`。
    2.  修改業務特定組件：`apps/web/components`。

---

## 5. 開發者指南 (Developer Guide)

### 5.1 前置需求
*   **Node.js**: >= 18
*   **pnpm**: >= 9 (推薦使用的包管理器)
*   **Git**

### 5.2 安裝 (Installation)

```bash
# 1. Clone
git clone <repo-url>
cd UniversalPrivate

# 2. 安裝依賴 (Root)
pnpm install

# 3. 下載 Railgun Artifacts (postinstall 腳本應會自動處理，若需手動)
# 通常由 `patch-package` 或 apps/web 內的 `pnpm copy-artifacts` 處理
```

### 5.3 本地運行 (Running Locally)

```bash
# 啟動開發伺服器 (Next.js 於 localhost:3000)
pnpm dev
```

### 5.4 測試 (Testing)

我們使用 **Vitest** 進行單元測試，覆蓋核心邏輯 (特別是跨鏈計算)。

```bash
# 執行所有測試
pnpm test

# 執行特定測試檔案
pnpm --filter web test -- lib/railgun/cross-chain-check.test.ts
```

*注意：部分測試需要 Mock `ethers`，這在 `apps/web/__mocks__` 中處理。*

---

## 6. 部署 (Deployment)

應用程式已針對 Vercel 部署進行優化，但也支援 Docker 化。

### 6.1 Vercel 部署
1.  **Build Command**: `pnpm build` (Root scope, 會觸發 turbo build)。
2.  **Output Directory**: `apps/web/.next` (Next.js default)。
3.  **Environment Variables**: 請確認對應 `.env.example`。
    *   `NEXT_PUBLIC_CHAIN_ID`
    *   `NEXT_PUBLIC_RPC_URL`

### 6.2 手動構建 (Manual Build)

```bash
# 清理並構建
pnpm build

# 啟動服務
cd apps/web
pnpm start
```

---

## 7. 未來規劃與擴展 (Future Roadmap)

1.  **Relayer Integration**: 目前交易為 Self-Signed。整合 Relayer 將允許 Gas-less 隱私交易 (使用代幣支付手續費)。
2.  **WASM Multi-threading**: 優化證明生成速度。
3.  **Mobile Support**: 針對行動瀏覽器的響應式設計改進。

---

*最後更新: 2025 年 12 月*
