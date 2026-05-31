import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { clearScreen, hideCursor, showCursor, getWidth, center } from './utils.js';
import { render, renderSync } from './renderer.js';

// ─── Directory Browser ───────────────────────────────────────────────────────

interface Entry {
  name: string;
  fullPath: string;
  isDir: boolean;
}

function getEntries(dir: string): Entry[] {
  const allEntries: Entry[] = [];

  // Add ".." if not root
  if (dir !== path.parse(dir).root) {
    allEntries.push({ name: '..', fullPath: path.dirname(dir), isDir: true });
  }

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const isDir = item.isDirectory();
      if (isDir || item.name.endsWith('.md') || item.name.endsWith('.markdown')) {
        allEntries.push({
          name: item.name,
          fullPath: path.join(dir, item.name),
          isDir,
        });
      }
    }
  } catch {
    // permission error etc
  }

  return allEntries.sort((a, b) => {
    if (a.name === '..') return -1;
    if (b.name === '..') return 1;
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function renderBrowser(entries: Entry[], selected: number, dir: string): void {
  clearScreen();
  const w = getWidth();

  console.log(chalk.bold.cyan(`\n  📂 ${dir}\n`));
  console.log(chalk.dim(`  ${'─'.repeat(w - 4)}`));

  if (entries.length === 0) {
    console.log(chalk.dim('\n  No markdown files found.\n'));
    return;
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isSelected = i === selected;
    const icon = entry.name === '..' ? '↩' : entry.isDir ? '📁' : '📄';
    const name = entry.isDir
      ? chalk.cyan(entry.name + '/')
      : chalk.white(entry.name);

    if (isSelected) {
      process.stdout.write(chalk.bgHex('#1a2744') + chalk.bold(`  › ${icon}  ${name}`) + '\x1b[0m' + '\n');
    } else {
      console.log(`    ${icon}  ${name}`);
    }
  }

  console.log(chalk.dim(`\n  ${'─'.repeat(w - 4)}`));
  console.log(chalk.dim('  ↑↓ navigate  •  Enter select  •  q quit'));
}

export async function browse(startDir: string): Promise<string | null> {
  let dir = path.resolve(startDir);
  let entries = getEntries(dir);
  let selected = 0;

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  hideCursor();
  renderBrowser(entries, selected, dir);

  return new Promise(resolve => {
    const onKey = (_str: string | undefined, key: readline.Key) => {
      if (!key) return;

      if (key.name === 'up' || (key.ctrl && key.name === 'p')) {
        selected = Math.max(0, selected - 1);
      } else if (key.name === 'down' || (key.ctrl && key.name === 'n')) {
        selected = Math.min(entries.length - 1, selected + 1);
      } else if (key.name === 'return' || key.name === 'enter') {
        const entry = entries[selected];
        if (!entry) return;

        if (entry.isDir) {
          dir = entry.fullPath;
          entries = getEntries(dir);
          selected = 0;
        } else {
          cleanup();
          resolve(entry.fullPath);
          return;
        }
      } else if (
        key.name === 'escape' || key.name === 'q' ||
        (key.ctrl && key.name === 'c')
      ) {
        cleanup();
        resolve(null);
        return;
      }

      renderBrowser(entries, selected, dir);
    };

    const cleanup = () => {
      process.stdin.off('keypress', onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      showCursor();
      clearScreen();
    };

    process.stdin.on('keypress', onKey);
  });
}

// ─── Presentation Mode ───────────────────────────────────────────────────────

function splitSlides(markdown: string): string[] {
  // Split on --- at start of line (horizontal rules that are clearly slide separators)
  const slides = markdown.split(/\n---\n/);
  return slides.filter(s => s.trim().length > 0);
}

async function renderSlide(slide: string, current: number, total: number): Promise<void> {
  clearScreen();
  const w = getWidth();

  const rendered = await render(slide);
  console.log(rendered);

  // Footer
  const progress = `${current}/${total}`;
  const controls = chalk.dim('← prev  space/→ next  q quit');
  const padding = w - controls.length - progress.length - 4;
  const footer = `\n${chalk.dim('─'.repeat(w))}\n ${controls}${' '.repeat(Math.max(0, padding))}${chalk.cyan(progress)} `;
  process.stdout.write(footer);
}

export async function present(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const slides = splitSlides(content);

  if (slides.length === 0) {
    console.log(chalk.red('No slides found.'));
    return;
  }

  let current = 0;

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  hideCursor();
  await renderSlide(slides[current], current + 1, slides.length);

  return new Promise(resolve => {
    const onKey = async (_str: string | undefined, key: readline.Key) => {
      if (!key) return;

      if (
        key.name === 'right' || key.name === 'space' || key.name === 'n' ||
        key.name === 'pagedown'
      ) {
        if (current < slides.length - 1) current++;
      } else if (
        key.name === 'left' || key.name === 'p' || key.name === 'pageup'
      ) {
        if (current > 0) current--;
      } else if (
        key.name === 'escape' || key.name === 'q' ||
        (key.ctrl && key.name === 'c')
      ) {
        cleanup();
        resolve();
        return;
      } else if (key.name === 'home') {
        current = 0;
      } else if (key.name === 'end') {
        current = slides.length - 1;
      }

      await renderSlide(slides[current], current + 1, slides.length);
    };

    const cleanup = () => {
      process.stdin.off('keypress', onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      showCursor();
      clearScreen();
    };

    process.stdin.on('keypress', onKey as Parameters<typeof process.stdin.on>[1]);
  });
}
