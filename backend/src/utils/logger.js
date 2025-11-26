// src/utils/logger.js
import chalk from "chalk";

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message, ...args) => {
    console.log(`${chalk.blue("[INFO]")} ${getTimestamp()} - ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`${chalk.yellow("[WARN]")} ${getTimestamp()} - ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`${chalk.red("[ERROR]")} ${getTimestamp()} - ${message}`, ...args);
  },
  success: (message, ...args) => {
    console.log(`${chalk.green("[SUCCESS]")} ${getTimestamp()} - ${message}`, ...args);
  },
};
