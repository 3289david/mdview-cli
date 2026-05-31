import chalk from 'chalk';
import stringWidth from 'string-width';
import wrapAnsi from 'wrap-ansi';

export const getWidth = (): number =>
  Math.min(process.stdout.columns ?? 80, 120);

export function wrapText(text: string, width?: number): string {
  return wrapAnsi(text, (width ?? getWidth()) - 2, { trim: false, hard: false });
}

export function padEnd(str: string, width: number, char = ' '): string {
  const w = stringWidth(str);
  if (w >= width) return str;
  return str + char.repeat(width - w);
}

export function center(str: string, width?: number): string {
  const w = width ?? getWidth();
  const sw = stringWidth(str);
  const padding = Math.max(0, Math.floor((w - sw) / 2));
  return ' '.repeat(padding) + str;
}

export function hyperlink(text: string, url: string): string {
  const isHyperSupported =
    process.env.TERM_PROGRAM === 'iTerm.app' ||
    process.env.TERM === 'xterm-kitty' ||
    process.env.VTE_VERSION !== undefined ||
    process.env.TERM_PROGRAM === 'WezTerm' ||
    process.env.WT_SESSION !== undefined;

  if (isHyperSupported) {
    return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
  }
  return `${text} ${chalk.dim.cyan(`(${url})`)}`;
}

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function moveCursor(row: number, col: number): void {
  process.stdout.write(`\x1b[${row};${col}H`);
}

export function stripAnsi(str: string): string {
  return str.replace(
    /[][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g,
    ''
  );
}
