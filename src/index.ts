import chalk from 'chalk';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { render } from './renderer.js';
import { browse, present } from './tui.js';
import { clearScreen } from './utils.js';

const VERSION = '1.0.0';

const HELP = `
${chalk.bold.cyan('md')} ${chalk.dim(`v${VERSION}`)} — Beautiful terminal Markdown viewer

${chalk.bold('Usage:')}
  ${chalk.cyan('md')} <file.md>              Render a Markdown file
  ${chalk.cyan('md')} .                      Browse Markdown files in current directory
  ${chalk.cyan('md')} <directory>            Browse Markdown files in directory
  ${chalk.cyan('md')} <file.md> --watch      Watch mode (re-render on save)
  ${chalk.cyan('md')} <file.md> --present    Presentation / slideshow mode
  ${chalk.cyan('md')} --help                 Show this help
  ${chalk.cyan('md')} --version              Show version

${chalk.bold('Options:')}
  ${chalk.cyan('-w, --watch')}    Re-render when file changes
  ${chalk.cyan('-p, --present')}  Presentation mode (use --- as slide separator)
  ${chalk.cyan('-h, --help')}     Show help
  ${chalk.cyan('-V, --version')}  Print version

${chalk.bold('Shell integration')} ${chalk.dim('(auto-run *.md files):')}
  Add this to your ${chalk.cyan('~/.zshrc')} or ${chalk.cyan('~/.bashrc')}:

  ${chalk.dim('command_not_found_handler() {')}
  ${chalk.dim('  [[ "$1" == *.md ]] && [ -f "$1" ] && md "$1" && return 0')}
  ${chalk.dim('  return 127')}
  ${chalk.dim('}')}

  Then ${chalk.cyan('source ~/.zshrc')} and type ${chalk.cyan('README.md')} to open it.

${chalk.bold('Shebang support:')}
  Add ${chalk.cyan('#!/usr/bin/env md')} as the first line of any .md file
  then ${chalk.cyan('chmod +x notes.md && ./notes.md')}
`;

async function renderFile(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Strip shebang if present
  const normalised = content.startsWith('#!') ? content.slice(content.indexOf('\n') + 1) : content;

  const baseDir = path.dirname(path.resolve(filePath));
  const rendered = await render(normalised, baseDir);

  process.stdout.write(rendered + '\n');
}

async function watchFile(filePath: string): Promise<void> {
  console.log(chalk.dim(`  Watching ${filePath} — Ctrl+C to stop\n`));

  await renderFile(filePath);

  const watcher = chokidar.watch(filePath, { persistent: true, ignoreInitial: true });

  watcher.on('change', async () => {
    clearScreen();
    console.log(chalk.dim(`  ${new Date().toLocaleTimeString()} — ${path.basename(filePath)} changed\n`));
    await renderFile(filePath);
  });

  // Keep alive
  await new Promise<void>(resolve => {
    process.on('SIGINT', () => {
      watcher.close();
      resolve();
    });
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-V')) {
    console.log(VERSION);
    process.exit(0);
  }

  const isWatch = args.includes('--watch') || args.includes('-w');
  const isPresent = args.includes('--present') || args.includes('-p');

  const fileArgs = args.filter(a => !a.startsWith('-'));
  const target = fileArgs[0];

  if (!target) {
    console.error(chalk.red('Error: no file or directory specified.'));
    console.log(HELP);
    process.exit(1);
  }

  const resolved = path.resolve(target);

  // Directory browsing
  let isDirectory = false;
  try {
    const stat = fs.statSync(resolved);
    isDirectory = stat.isDirectory();
  } catch {
    // file doesn't exist — might be a typo or a new file
  }

  if (isDirectory) {
    const chosen = await browse(resolved);
    if (chosen) {
      if (isPresent) {
        await present(chosen);
      } else if (isWatch) {
        await watchFile(chosen);
      } else {
        await renderFile(chosen);
      }
    }
    return;
  }

  // Check file exists
  if (!fs.existsSync(resolved)) {
    console.error(chalk.red(`Error: file not found: ${resolved}`));
    process.exit(1);
  }

  const ext = path.extname(resolved).toLowerCase();
  if (ext !== '.md' && ext !== '.markdown' && ext !== '.mdx' && ext !== '') {
    // Try to render anyway
  }

  if (isPresent) {
    await present(resolved);
  } else if (isWatch) {
    await watchFile(resolved);
  } else {
    await renderFile(resolved);
  }
}

main().catch(err => {
  console.error(chalk.red(`\nError: ${err.message ?? err}`));
  process.exit(1);
});
