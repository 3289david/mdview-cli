import chalk from 'chalk';
import { highlight, supportsLanguage } from 'cli-highlight';
import { getWidth } from './utils.js';
import { renderMermaid } from './mermaid.js';
import { renderBlockMath } from './math.js';

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python',
  rb: 'ruby', sh: 'bash', zsh: 'bash', fish: 'bash',
  yml: 'yaml', md: 'markdown', tf: 'hcl',
  rs: 'rust', kt: 'kotlin', cs: 'csharp',
  cpp: 'cpp', 'c++': 'cpp', cc: 'cpp',
  html: 'html', css: 'css', scss: 'scss', sass: 'sass',
  json: 'json', xml: 'xml', sql: 'sql',
  go: 'go', java: 'java', php: 'php', swift: 'swift',
  r: 'r', lua: 'lua', pl: 'perl', perl: 'perl',
  dockerfile: 'dockerfile', makefile: 'makefile',
  graphql: 'graphql', gql: 'graphql',
};

const LANG_COLORS: Record<string, (s: string) => string> = {
  javascript: chalk.yellow,
  typescript: chalk.blue,
  python: chalk.green,
  ruby: chalk.red,
  bash: chalk.green,
  rust: chalk.hex('#ff6b35'),
  go: chalk.cyan,
  java: chalk.hex('#b07219'),
  kotlin: chalk.hex('#7f52ff'),
  swift: chalk.hex('#f05138'),
  css: chalk.magenta,
  html: chalk.hex('#e44b23'),
  json: chalk.yellow,
  yaml: chalk.cyan,
  sql: chalk.blue,
  cpp: chalk.blue,
  csharp: chalk.hex('#239120'),
  php: chalk.hex('#4f5d95'),
  markdown: chalk.white,
};

function getLangLabel(lang: string): string {
  const normalized = LANG_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
  const colorFn = LANG_COLORS[normalized] ?? chalk.white;
  const display = lang || 'text';
  return colorFn(display.charAt(0).toUpperCase() + display.slice(1));
}

function highlightCode(code: string, lang: string): string {
  if (!lang) return code;
  const normalized = LANG_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
  try {
    if (supportsLanguage(normalized)) {
      return highlight(code, { language: normalized, ignoreIllegals: true });
    }
  } catch {
    // fall through to plain
  }
  return code;
}

export function renderCodeBlock(code: string, lang: string): string {
  const normalizedLang = lang.toLowerCase().trim();

  // Mermaid diagrams
  if (normalizedLang === 'mermaid') {
    return renderMermaid(code);
  }

  // Math blocks
  if (normalizedLang === 'math' || normalizedLang === 'latex' || normalizedLang === 'tex') {
    return renderBlockMath(code);
  }

  const w = getWidth() - 2;
  const langLabel = getLangLabel(lang);
  const labelText = lang ? ` ${langLabel} ` : '';
  const labelWidth = lang ? lang.length + 2 : 0;
  const topLineLen = Math.max(2, w - labelWidth - 2);

  const topBorder = `╭─${labelText}${'─'.repeat(topLineLen)}╮`;
  const bottomBorder = `╰${'─'.repeat(w - 1)}╯`;

  const highlighted = highlightCode(code, lang);
  const codeLines = highlighted.split('\n');

  // Remove trailing empty line if present
  while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') {
    codeLines.pop();
  }

  const paddedLines = codeLines.map(line => `│ ${line}`);

  return `\n${topBorder}\n${paddedLines.join('\n')}\n${bottomBorder}\n`;
}
