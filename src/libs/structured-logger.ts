/** Structured logger for browser console.
 *
 * Format: `[ISO_TS] LEVEL op key=value key=value ...`
 *
 * Mirrors the backend StructuredLogger format for consistency.
 * In production, set `NEXT_PUBLIC_LOG_LEVEL=error` to suppress debug/info.
 *
 * Usage:
 *   import { getLogger } from '@/libs/structured-logger';
 *   const log = getLogger('mcp');
 *   log.info('connector_connect', url='...', duration_ms=123);
 *   log.error('connector_failed', url='...', error=err.message);
 */
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const configuredLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';

const isoNow = () => new Date().toISOString();

function fmtValue(v: unknown): string {
  if (typeof v === 'string') {
    if (/\s|["=]/.test(v)) return `"${v.replace(/"/g, '\\"')}"`;
    return v;
  }
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Error) return `"${v.message}"`;
  return String(v);
}

function fmtKV(fields: Record<string, unknown>): string {
  return Object.entries(fields)
    .map(([k, v]) => `${k}=${fmtValue(v)}`)
    .join(' ');
}

class StructuredLogger {
  constructor(private name: string) {}

  private emit(level: LogLevel, op: string, fields: Record<string, unknown>) {
    if (LOG_LEVELS[level] < LOG_LEVELS[configuredLevel]) return;

    const msg = `${isoNow()} ${level.toUpperCase()} [${this.name}] ${op} ${fmtKV(fields)}`.trim();

    switch (level) {
      case 'error':
        console.error(msg);
        break;
      case 'warn':
        console.warn(msg);
        break;
      case 'info':
        console.info(msg);
        break;
      default:
        console.debug(msg);
    }
  }

  debug(op: string, fields: Record<string, unknown> = {}) {
    this.emit('debug', op, fields);
  }
  info(op: string, fields: Record<string, unknown> = {}) {
    this.emit('info', op, fields);
  }
  warn(op: string, fields: Record<string, unknown> = {}) {
    this.emit('warn', op, fields);
  }
  error(op: string, fields: Record<string, unknown> = {}) {
    this.emit('error', op, fields);
  }
}

const cache = new Map<string, StructuredLogger>();

export function getLogger(name: string): StructuredLogger {
  const existing = cache.get(name);
  if (existing) return existing;
  const logger = new StructuredLogger(name);
  cache.set(name, logger);
  return logger;
}
