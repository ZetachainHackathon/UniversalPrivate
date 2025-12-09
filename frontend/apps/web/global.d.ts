// apps/web/global.d.ts

// 擴充全域 Window 介面
interface Window {
  ethereum?: any; // 或是更嚴謹的 Eip1193Provider，但用 any 最快解決
}