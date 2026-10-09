/**
 * Update logger — structured, secret-redacting file log for project updates.
 * Every update run writes to its own file under DATA_DIR/logs/.
 */
import { appendFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from '../../../../core/infra/storage.ts';

export type UpdateLogLevel = 'INFO' | 'WARN' | 'ERROR';

const SENSITIVE_HEADER_PATTERN =
  /\b(authorization|proxy-authorization|cookie|set-cookie)\b\s*[:=].*/gi;
const SENSITIVE_KEY_VALUE_PATTERN =
  /\b(token|password|passwd|secret|aas[^\s=]*|session[^\s=]*|api[-_]?key)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s;,]+)/gi;

export function redactSensitiveText(text: string): string {
  return text
    .replace(SENSITIVE_HEADER_PATTERN, (match) => {
      const key = match.split(/[:=]/, 1)[0] ?? 'secret';
      return `${key.trim()}: [REDACTED]`;
    })
    .replace(SENSITIVE_KEY_VALUE_PATTERN, '$1=[REDACTED]');
}

export function getUpdateLogDirectory() {
  return join(DATA_DIR, 'logs');
}

function timestampSlug(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export class UpdateLogger {
  readonly path: string;

  constructor(scope: string, now: Date = new Date()) {
    const logDirectory = getUpdateLogDirectory();
    mkdirSync(logDirectory, { recursive: true });
    this.path = join(logDirectory, `update-${scope}-${timestampSlug(now)}.log`);
    appendFileSync(this.path, `[${now.toISOString()}] INFO === update ${scope} started ===\n`);
  }

  log(level: UpdateLogLevel, message: string, detail?: string) {
    const safeMessage = redactSensitiveText(message);
    const safeDetail = detail ? ` | ${redactSensitiveText(detail)}` : '';
    appendFileSync(
      this.path,
      `[${new Date().toISOString()}] ${level} ${safeMessage}${safeDetail}\n`,
    );
  }

  info(message: string, detail?: string) {
    this.log('INFO', message, detail);
  }

  warn(message: string, detail?: string) {
    this.log('WARN', message, detail);
  }

  error(message: string, detail?: string) {
    this.log('ERROR', message, detail);
  }

  command(command: string, args: string[], exitCode: number, detail?: string) {
    this.info(`$ ${command} ${args.join(' ')}`, `exit=${exitCode}${detail ? ` ${detail}` : ''}`);
  }
}

/** Returns the most recent update log file path, when one exists. */
export function findLatestUpdateLogPath(): string | null {
  const logDirectory = getUpdateLogDirectory();
  let entries: string[];
  try {
    entries = readdirSync(logDirectory);
  } catch {
    return null;
  }

  let latest: { path: string; mtimeMs: number } | null = null;
  for (const entry of entries) {
    if (!entry.startsWith('update-') || !entry.endsWith('.log')) {
      continue;
    }
    const fullPath = join(logDirectory, entry);
    try {
      const stats = statSync(fullPath);
      if (!latest || stats.mtimeMs > latest.mtimeMs) {
        latest = { path: fullPath, mtimeMs: stats.mtimeMs };
      }
    } catch {
      // Ignore unreadable entries.
    }
  }
  return latest?.path ?? null;
}
