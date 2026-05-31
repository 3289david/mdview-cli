import chalk from 'chalk';
import stringWidth from 'string-width';

type Align = 'left' | 'center' | 'right' | null;

function stripAnsi(str: string): string {
  return str.replace(
    /[][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g,
    ''
  );
}

function padCell(content: string, width: number, align: Align): string {
  const visible = stringWidth(stripAnsi(content));
  const pad = Math.max(0, width - visible);
  if (align === 'right') return ' '.repeat(pad) + content;
  if (align === 'center') {
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + content + ' '.repeat(right);
  }
  return content + ' '.repeat(pad);
}

export function renderTable(
  headers: string[],
  rows: string[][],
  aligns: Align[]
): string {
  const colWidths = headers.map((h, i) => {
    const hWidth = stringWidth(stripAnsi(h));
    const maxRow = rows.reduce((max, row) => {
      const cell = row[i] ?? '';
      return Math.max(max, stringWidth(stripAnsi(cell)));
    }, 0);
    return Math.max(hWidth, maxRow, 3);
  });

  const border = (left: string, mid: string, right: string, fill: string) =>
    left + colWidths.map(w => fill.repeat(w + 2)).join(mid) + right;

  const top = border('┌', '┬', '┐', '─');
  const divider = border('├', '┼', '┤', '─');
  const bottom = border('└', '┴', '┘', '─');

  const makeRow = (cells: string[], bold = false) => {
    const formatted = colWidths.map((w, i) => {
      const content = cells[i] ?? '';
      const align = aligns[i] ?? 'left';
      const padded = padCell(content, w, align);
      return bold ? chalk.bold(padded) : padded;
    });
    return '│ ' + formatted.join(' │ ') + ' │';
  };

  const headerRow = makeRow(headers, true);
  const dataRows = rows.map(row => makeRow(row));

  return [top, headerRow, divider, ...dataRows, bottom].join('\n');
}
