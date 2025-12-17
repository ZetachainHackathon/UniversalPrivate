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
    *   **DeFi Operations**: `apps/web/lib/railgun/liquidity.ts` - 隱私 DeFi 操作，透過 RelayAdapt 的 multicall 功能與 DEX 協議交互（如增加流動性、交換等）。

### 3.3 狀態管理模式 (State Management)

我們避免使用重型的全局狀態庫 (Redux/Zustand)，而採用 **Context + Hooks**：
*   **全局**: `RailgunProvider`, `WalletProvider`, `ConfirmDialogProvider`.
*   **局部**: 表單狀態 (React `useState`).
*   **反饋**: 使用 `sonner` Toast 處理異步操作的狀態提示。

### 3.4 微觀架構詳解 (Micro Architecture Detail)

本節深入解釋 `apps/web` 下各個核心目錄的具體職責。

#### 1. `components/cross-chain/` (業務組件)
這些是專門為 "跨鏈隱私交易" 頁面設計的業務組件，並非通用 UI。
*   **`header.tsx`**: 頂部狀態列。負責顯示當前連線的網路（支援所有配置的鏈，包括 ZetaChain）、錢包連接按鈕、以及 Railgun 地址。提供網路切換下拉選單，可切換到任何已配置的測試網。
*   **`shield-form.tsx`**: "入金" 表單。負責收集用戶輸入 (Token, Amount)，並呼叫 `useShieldTransaction` 將公開代幣轉換為私有代幣 (Shield)。
*   **`transfer-form.tsx`**: "隱私轉帳/跨鏈" 表單。負責收集接收方與金額，處理 0zk -> 0zk 轉帳或 Unshield 跨鏈操作。
*   **`liquidity-form.tsx`**: "DeFi 操作" 表單。實現兩階段操作流程：
    1.  **第一階段**：DeFi 功能選擇頁面，顯示「流動性管理」選項（可點擊進入）和「Coming Soon」提示。
    2.  **第二階段**：流動性管理介面，包含「添加流動性」和「移除流動性」選項。添加流動性功能提供完整的 UI（代幣對選擇、金額輸入、餘額顯示），目前後端邏輯為佔位符，待完整實作。

#### 2. `components/providers/` (全局 Context)
應用程式的 "脊椎"，負責管理全域單例狀態。
*   **`wallet-provider.tsx`**: 封裝 Ethers.js 的 `BrowserProvider`。管理 MetaMask 連線、Chain ID 監聽與切換網路功能。
*   **`railgun-provider.tsx`**: 管理 Railgun Wallet 的生命週期。
    *   `login(password)`: 驗證密碼並設定 Session Key。
    *   `walletInfo`: 當前加載的 Railgun 錢包資訊 (ID, Address)。
*   **`confirm-dialog-provider.tsx`**: 提供 `useConfirm` hook。允許在任何地方 (包含 Hooks 內部) 喚起一個 Promise-based 的確認視窗。

#### 3. `hooks/` (邏輯核心)
這裡是 "大腦"，所有副作用與複雜計算都在此發生。
*   **`use-shield-tx.ts`**: 封裝 Shield 流程。
    *   自動檢查 Allowance (授權)。
    *   區分 Cross-Chain Shield (Sepolia -> Zeta) 與 Local Shield。
*   **`use-transfer-tx.ts`**: 封裝 Transfer 流程。
    *   生成 Zero-Knowledge Proof (運算密集型)。
    *   建構跨鏈 Unshield Transaction。
*   **`use-liquidity-tx.ts`**: 封裝 DeFi 操作流程（待實作）。
    *   處理流動性添加/移除的邏輯。
    *   透過 RelayAdapt 的 multicall 功能與 DEX 合約交互。
    *   確保代幣從 Railgun 隱私池中正確提取並提供到流動性池。
    *   目前 UI 層已完成，待實作後端交易邏輯。
*   **`use-network-sync.ts`**: 確保 URL 路由與當前錢包網路一致。
*   **`use-railgun-auto-scan.ts`**: 背景勾子，定時觸發餘額掃描與 Merkle Tree 重建。

#### 4. `lib/railgun/` (SDK 封裝層)
直接與 `@railgun-community/*` SDK 交互的底層代碼，隔離了 SDK 的複雜性。
*   **`wallet.ts` / `wallet-actions.ts`**: 錢包創建、載入、助記詞管理。
*   **`shield.ts`**: 建構 Shield Transaction 的具體實作 (Ethers Contract calls)。
*   **`transfer.ts`**: 建構 0zk -> 0zk 的 Proof 與 Transaction。
*   **`cross-chain-transfer.ts`**: 最複雜的檔案。負責處理：
    1.  生成 Unshield Proof (私有 -> 公開)。
    2.  建構對 `ZetachainAdapt` 合約的呼叫 (轉移資產)。
    3.  建構對 `EVMAdapt` 的 `unshieldOutsideChain` 呼叫。
*   **`liquidity.ts`**: DeFi 操作封裝層（待實作）。負責：
    1.  生成 Unshield Proof 以從 Railgun 隱私池提取代幣。
    2.  建構對 DEX 合約的調用（如 Uniswap V2 Router 的 `addLiquidity`）。
    3.  透過 RelayAdapt 的 multicall 功能在單筆交易中完成 Unshield + DeFi 操作 + Shield（可選）。
    4.  處理代幣對的比例計算和滑點保護。
    5.  目前僅在 ZetaChain 上支援，UI 層已完成，待實作完整的交易邏輯。
*   **`db.ts`**: 配置 LevelDB 用於儲存加密數據。

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

我們使用 **Vitest** 進行單元測試。由於本專案是 Monorepo 架構，測試指令需要透過 `pnpm` 的篩選器 (Filter) 或 `turbo` pipeline 來執行，**請勿直接在根目錄執行 `vitest` 指令，因為該套件僅安裝在 `apps/web` 工作區中。**

#### 為什麼要這樣跑？
Monorepo 將不同專案 (apps/packages) 隔離。根目錄的 `node_modules` 通常不包含子專案的開發依賴 (如 vitest)。因此我們必須告訴 pnmp "去 apps/web 裡面執行 test 指令"。

#### 常用指令

**1. 執行所有測試 (推薦)**
這會透過 TurboRepo 執行整個所有工作區的測試：
```bash
pnpm test
```

**2. 僅執行 Web 前端的測試**
如果您只想跑前端的測試，不跑其他 packages：
```bash
pnpm --filter web test
```

**3. 執行特定測試檔案 (開發時最常用)**
如果您正在開發 Cross-Chain 功能，只想跑相關的測試：
```bash
# 格式: pnpm --filter <workspace_name> test -- <file_path>
pnpm --filter web test -- lib/railgun/cross-chain-check.test.ts
```

#### Mocking 說明
部分核心庫 (如 `ethers`) 在單元測試環境中無法直接運行 (因為涉及網路或 WASM)。
我們在 `apps/web/__mocks__` 目錄下建立了手動 Mock：
*   `ethers.ts`: 模擬了 Contract, Provider 與 parseUnits 等核心功能，讓測試專注於驗證業務邏輯流程。

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
4.  **DeFi 功能完整實作**:
    *   完成 `use-liquidity-tx.ts` hook 和 `liquidity.ts` 庫的實作。
    *   實作流動性添加的完整交易邏輯（目前 UI 已完成）。
    *   實作流動性移除功能（目前顯示 Coming Soon）。
    *   支援多種 DEX 協議（Uniswap V2/V3、ZetaSwap 等）。
    *   實作隱私代幣交換（Swap）功能（目前顯示 Coming Soon）。
    *   整合更多 DeFi 協議（借貸、質押等，目前顯示 Coming Soon）。

---

*最後更新: 2025 年 1 月*
