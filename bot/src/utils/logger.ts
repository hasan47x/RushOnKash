export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  updateType?: string;
}

const isProduction = process.env.NODE_ENV === 'production';

function formatLog(entry: LogEntry): string {
  const { level, message, timestamp, context, userId, updateType } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const userInfo = userId ? ` [user:${userId}]` : '';
  const updateInfo = updateType ? ` [${updateType}]` : '';
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `${prefix}${userInfo}${updateInfo} ${message}${ctx}`;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>, userId?: string, updateType?: string) {
    const entry: LogEntry = { level: 'info', message, timestamp: new Date().toISOString(), context, userId, updateType };
    console.log(formatLog(entry));
  },
  
  warn(message: string, context?: Record<string, unknown>, userId?: string, updateType?: string) {
    const entry: LogEntry = { level: 'warn', message, timestamp: new Date().toISOString(), context, userId, updateType };
    console.warn(formatLog(entry));
  },
  
  error(message: string, context?: Record<string, unknown>, userId?: string, updateType?: string) {
    const entry: LogEntry = { level: 'error', message, timestamp: new Date().toISOString(), context, userId, updateType };
    console.error(formatLog(entry));
  },
  
  debug(message: string, context?: Record<string, unknown>, userId?: string, updateType?: string) {
    if (!isProduction) {
      const entry: LogEntry = { level: 'debug', message, timestamp: new Date().toISOString(), context, userId, updateType };
      console.log(formatLog(entry));
    }
  },
};