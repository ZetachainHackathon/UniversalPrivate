// apps/web/lib/railgun/logger.ts
import { setLoggers } from "@st99005912/universal-private-sdk";

/**
 * 設定 Railgun 引擎的日誌記錄器
 * 這會攔截引擎內部的 log 並加上時間戳記，方便除錯
 */
export const setEngineLoggers = () => {
  const logMessage = (msg: any) => {
    // 開發環境下才印出 log，避免生產環境過於吵雜
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Engine Log] ${new Date().toISOString()}:`, msg);
    }
  };

  const logError = (msg: any) => {
    console.error(`[Engine Error] ${new Date().toISOString()}:`, msg);
  };

  setLoggers(logMessage, logError);
};