import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { getWidth } from './utils.js';

async function loadTerminalImage(): Promise<typeof import('terminal-image') | null> {
  try {
    const mod = await import('terminal-image');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

function renderAsciiPlaceholder(alt: string, src: string, width: number): string {
  const label = alt || path.basename(src) || 'image';
  const inner = ` 🖼  ${label} `;
  const innerWidth = Math.max(inner.length, 20);
  const w = Math.min(width, innerWidth + 4);
  const top = `╭${'─'.repeat(w - 2)}╮`;
  const mid = `│${inner.padStart(Math.floor((w - 2 + inner.length) / 2)).padEnd(w - 2)}│`;
  const bottom = `╰${'─'.repeat(w - 2)}╯`;
  return `\n${chalk.dim(top)}\n${chalk.dim(mid)}\n${chalk.dim(bottom)}\n`;
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

export async function renderImage(src: string, alt: string, baseDir?: string): Promise<string> {
  const w = getWidth();
  const termImg = await loadTerminalImage();

  if (!termImg) {
    return renderAsciiPlaceholder(alt, src, w);
  }

  try {
    // Remote image
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const buf = await fetchBuffer(src);
      if (!buf) return renderAsciiPlaceholder(alt, src, w);
      const img = await termImg.buffer(buf, { width: Math.min(w - 4, 80), preserveAspectRatio: true });
      return `\n${img}\n`;
    }

    // Local image
    const filePath = path.isAbsolute(src)
      ? src
      : path.join(baseDir ?? process.cwd(), src);

    if (!fs.existsSync(filePath)) {
      return renderAsciiPlaceholder(alt, src, w);
    }

    const img = await termImg.file(filePath, { width: Math.min(w - 4, 80), preserveAspectRatio: true });
    return `\n${img}\n`;
  } catch {
    return renderAsciiPlaceholder(alt, src, w);
  }
}
