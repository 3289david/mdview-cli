import chalk from 'chalk';
import { Lexer, type Token, type Tokens } from 'marked';
import wrapAnsi from 'wrap-ansi';
import { getWidth, hyperlink, padEnd } from './utils.js';
import { renderCodeBlock } from './code.js';
import { renderTable } from './table.js';
import { renderImage } from './image.js';
import { processMath } from './math.js';

const BULLET_CHARS = ['•', '◦', '▪', '·'];

// ─── Inline rendering ────────────────────────────────────────────────────────

function renderInline(tokens: Token[] | undefined, fallback = ''): string {
  if (!tokens || tokens.length === 0) return processMath(fallback);
  return processMath(tokens.map(renderInlineToken).join(''));
}

function renderInlineToken(token: Token): string {
  switch (token.type) {
    case 'strong': {
      const t = token as Tokens.Strong;
      return chalk.bold(renderInline(t.tokens, t.text));
    }
    case 'em': {
      const t = token as Tokens.Em;
      return chalk.italic(renderInline(t.tokens, t.text));
    }
    case 'del': {
      const t = token as Tokens.Del;
      return chalk.strikethrough(renderInline(t.tokens, t.text));
    }
    case 'codespan': {
      const t = token as Tokens.Codespan;
      return chalk.bgHex('#1e2030').cyan(` ${t.text} `);
    }
    case 'link': {
      const t = token as Tokens.Link;
      const text = renderInline(t.tokens, t.text);
      if (!t.href) return text;
      const isAutoLink = text === t.href;
      const display = isAutoLink ? chalk.cyan(text) : `${chalk.underline.cyan(text)}`;
      return hyperlink(display, t.href);
    }
    case 'image': {
      const t = token as Tokens.Image;
      // inline images are resolved async; return placeholder for sync context
      return chalk.dim(`[image: ${t.text || t.href}]`);
    }
    case 'br': {
      return '\n';
    }
    case 'escape': {
      const t = token as Tokens.Escape;
      return t.text;
    }
    case 'html': {
      // Strip inline HTML tags
      const t = token as Tokens.Tag;
      return t.text.replace(/<[^>]+>/g, '');
    }
    case 'text': {
      const t = token as Tokens.Text;
      if (t.tokens) return renderInline(t.tokens, t.text);
      return t.text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
    default:
      return (token as { raw?: string }).raw ?? '';
  }
}

// ─── Block rendering ──────────────────────────────────────────────────────────

function renderHeading(token: Tokens.Heading): string {
  const w = getWidth();
  const text = renderInline(token.tokens, token.text);
  const rawText = token.text;

  switch (token.depth) {
    case 1: {
      const line = chalk.bold.cyan('━'.repeat(w));
      const centered = chalk.bold.white(rawText.toUpperCase());
      const pad = Math.max(0, Math.floor((w - rawText.length) / 2));
      return `\n${line}\n${' '.repeat(pad)}${centered}\n${line}\n`;
    }
    case 2: {
      const under = chalk.cyan('─'.repeat(Math.min(rawText.length + 2, w - 2)));
      return `\n  ${chalk.bold.cyan(text)}\n  ${under}\n`;
    }
    case 3:
      return `\n  ${chalk.bold.yellow('▸')} ${chalk.bold(text)}\n`;
    case 4:
      return `\n  ${chalk.yellow('●')} ${chalk.bold(text)}\n`;
    case 5:
      return `\n  ${chalk.dim('◦')} ${chalk.underline(text)}\n`;
    default:
      return `\n  ${chalk.dim('·')} ${chalk.dim(text)}\n`;
  }
}

function renderParagraph(token: Tokens.Paragraph): string {
  const text = renderInline(token.tokens, token.text);
  const wrapped = wrapAnsi(text, getWidth() - 2, { trim: false, hard: false });
  return `\n${wrapped}\n`;
}

function renderBlockquote(token: Tokens.Blockquote): string {
  const inner = walkTokens(token.tokens ?? []);
  const lines = inner.split('\n').filter((l, i, arr) => {
    // Remove leading/trailing blank lines
    if (i === 0 && l.trim() === '') return false;
    if (i === arr.length - 1 && l.trim() === '') return false;
    return true;
  });
  const barred = lines
    .map(l => chalk.cyan('┃') + ' ' + chalk.italic(l.replace(/^[\s│┃]+/, '')))
    .join('\n');
  return `\n${barred}\n`;
}

function renderHr(): string {
  return `\n${chalk.dim('─'.repeat(getWidth()))}\n`;
}

function renderHtml(token: Tokens.HTML): string {
  const text = token.text.replace(/<[^>]+>/g, '').trim();
  return text ? `\n${chalk.dim(text)}\n` : '';
}

function renderListItem(
  item: Tokens.ListItem,
  ordered: boolean,
  index: number,
  depth: number
): string {
  const indent = '  '.repeat(depth + 1);
  let bullet: string;

  if (item.task) {
    bullet = item.checked ? chalk.green('☑') : chalk.dim('☐');
  } else if (ordered) {
    bullet = chalk.cyan(`${index + 1}.`);
  } else {
    bullet = chalk.cyan(BULLET_CHARS[Math.min(depth, BULLET_CHARS.length - 1)]);
  }

  // Render item contents
  let content: string;
  if (item.tokens && item.tokens.length > 0) {
    // Check if the first token is a paragraph (loose list)
    const firstToken = item.tokens[0];
    if (firstToken.type === 'paragraph') {
      const para = firstToken as Tokens.Paragraph;
      content = renderInline(para.tokens, para.text);
      // Render remaining tokens (nested lists, etc.)
      const rest = item.tokens.slice(1);
      if (rest.length > 0) {
        content += '\n' + walkTokens(rest, depth);
      }
    } else {
      content = walkTokens(item.tokens, depth);
    }
  } else {
    content = renderInline(undefined, item.text);
  }

  const firstLine = content.split('\n')[0] ?? '';
  const restLines = content.split('\n').slice(1);
  const restFormatted = restLines
    .map(l => l.trim() ? `${indent}  ${l}` : '')
    .join('\n');

  return `${indent}${bullet} ${firstLine}${restFormatted ? '\n' + restFormatted : ''}`;
}

function renderList(token: Tokens.List, depth = 0): string {
  const items = token.items.map((item, i) =>
    renderListItem(item, token.ordered, i, depth)
  );
  return `\n${items.join('\n')}\n`;
}

function renderTableToken(token: Tokens.Table): string {
  const headers = token.header.map(cell => renderInline(cell.tokens, cell.text));
  const rows = token.rows.map(row =>
    row.map(cell => renderInline(cell.tokens, cell.text))
  );
  const aligns = token.align as Array<'left' | 'center' | 'right' | null>;
  return `\n${renderTable(headers, rows, aligns)}\n`;
}

function renderDefLink(token: Tokens.Def): string {
  return '';  // link definitions are invisible
}

// ─── Walk token list ─────────────────────────────────────────────────────────

function walkTokens(tokens: Token[], depth = 0): string {
  return tokens.map(token => walkToken(token, depth)).join('');
}

function walkToken(token: Token, depth = 0): string {
  switch (token.type) {
    case 'heading':
      return renderHeading(token as Tokens.Heading);
    case 'paragraph':
      return renderParagraph(token as Tokens.Paragraph);
    case 'code':
      return renderCodeBlock((token as Tokens.Code).text, (token as Tokens.Code).lang ?? '');
    case 'blockquote':
      return renderBlockquote(token as Tokens.Blockquote);
    case 'list':
      return renderList(token as Tokens.List, depth);
    case 'table':
      return renderTableToken(token as Tokens.Table);
    case 'hr':
      return renderHr();
    case 'html':
      return renderHtml(token as Tokens.HTML);
    case 'space':
      return '\n';
    case 'def':
      return renderDefLink(token as Tokens.Def);
    default:
      // Treat unknown block tokens as paragraphs
      if ((token as { tokens?: Token[] }).tokens) {
        return walkTokens((token as { tokens: Token[] }).tokens, depth);
      }
      return (token as { raw?: string }).raw ?? '';
  }
}

// ─── Async image pass ────────────────────────────────────────────────────────

async function resolveImages(
  text: string,
  tokens: Token[],
  baseDir?: string
): Promise<string> {
  // Collect all image tokens from the tree
  const imageTokens: Array<{ href: string; alt: string }> = [];

  function collectImages(ts: Token[]): void {
    for (const t of ts) {
      if (t.type === 'image') {
        const img = t as Tokens.Image;
        imageTokens.push({ href: img.href, alt: img.text });
      }
      const sub = (t as { tokens?: Token[] }).tokens;
      if (sub) collectImages(sub);
      if (t.type === 'list') {
        for (const item of (t as Tokens.List).items) {
          collectImages(item.tokens ?? []);
        }
      }
    }
  }

  collectImages(tokens);

  // Render each image
  let result = text;
  for (const { href, alt } of imageTokens) {
    const placeholder = chalk.dim(`[image: ${alt || href}]`);
    const rendered = await renderImage(href, alt, baseDir);
    result = result.replace(placeholder, rendered);
  }

  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function render(markdown: string, baseDir?: string): Promise<string> {
  const lexer = new Lexer({ gfm: true, breaks: false });
  const tokens = lexer.lex(markdown);

  let output = walkTokens(tokens);

  // Resolve images asynchronously
  output = await resolveImages(output, tokens, baseDir);

  // Trim leading/trailing blank lines, keep single trailing newline
  output = output.replace(/^\n+/, '\n').replace(/\n{3,}/g, '\n\n');

  return output;
}

export function renderSync(markdown: string): string {
  const lexer = new Lexer({ gfm: true, breaks: false });
  const tokens = lexer.lex(markdown);
  const output = walkTokens(tokens);
  return output.replace(/^\n+/, '\n').replace(/\n{3,}/g, '\n\n');
}
