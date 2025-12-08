import { setLoggers } from "@railgun-community/wallet";

/**
 * Sets up custom loggers for the engine.
 *
 * This function configures the engine to use custom logging functions that
 * prefix messages with timestamps and appropriate labels.
 *
 * - For standard logs: Prefixes with "Engine log: [timestamp]"
 * - For error logs: Prefixes with "Engine error: [timestamp]"
 *
 * The configured loggers will output to the console using console.log and console.error.
 *
 * @example
 * // Set up custom engine loggers
 * setEngineLoggers();
 *
 */
export const setEngineLoggers = () => {
  const logMessage = (msg: any) => {
    console.log(`Engine log: ${new Date()} `, msg);
  };
  const logError = (_msg: any) => {
    // console.error(`Engine error: ${new Date()} `, msg);
  };

  setLoggers(logMessage, logError);
};