import chalk from 'chalk';
import { getWidth } from './utils.js';

interface Edge {
  from: string;
  to: string;
  label?: string;
  style: '-->' | '---' | '-.->' | '==>' | '~~>';
}

interface Node {
  id: string;
  label: string;
  shape: 'rect' | 'round' | 'circle' | 'diamond' | 'hex';
}

function parseLabel(raw: string): string {
  return raw.replace(/["[\](){}]/g, '').trim();
}

function parseNode(id: string): Node {
  const rectMatch = id.match(/^(\w+)\[(.+)\]$/);
  if (rectMatch) return { id: rectMatch[1], label: parseLabel(rectMatch[2]), shape: 'rect' };
  const roundMatch = id.match(/^(\w+)\((.+)\)$/);
  if (roundMatch) return { id: roundMatch[1], label: parseLabel(roundMatch[2]), shape: 'round' };
  const circleMatch = id.match(/^(\w+)\(\((.+)\)\)$/);
  if (circleMatch) return { id: circleMatch[1], label: parseLabel(circleMatch[2]), shape: 'circle' };
  const diamondMatch = id.match(/^(\w+)\{(.+)\}$/);
  if (diamondMatch) return { id: diamondMatch[1], label: parseLabel(diamondMatch[2]), shape: 'diamond' };
  return { id, label: id, shape: 'rect' };
}

function renderFlowchart(lines: string[]): string {
  const nodes = new Map<string, Node>();
  const edges: Edge[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || line.startsWith('style ') || line.startsWith('classDef ') || line.startsWith('class ')) continue;

    // Arrow patterns
    const arrowPatterns: Array<[RegExp, Edge['style']]> = [
      [/^(.+?)\s*-->\|(.+?)\|\s*(.+)$/, '-->'],
      [/^(.+?)\s*-->(.+?)\|(.+?)\|$/, '-->'],
      [/^(.+?)\s*-->\s*(.+)$/, '-->'],
      [/^(.+?)\s*---\s*(.+)$/, '---'],
      [/^(.+?)\s*-\.->\s*(.+)$/, '-.->' ],
      [/^(.+?)\s*==>\s*(.+)$/, '==>'],
    ];

    for (const [pat, style] of arrowPatterns) {
      const m = line.match(pat);
      if (m) {
        const fromNode = parseNode(m[1].trim());
        const toNode = parseNode(m[2].trim());
        // Only add node if not already known with a real label, or if this one has a better label
        if (!nodes.has(fromNode.id) || fromNode.label !== fromNode.id) nodes.set(fromNode.id, fromNode);
        if (!nodes.has(toNode.id) || toNode.label !== toNode.id) nodes.set(toNode.id, toNode);
        edges.push({ from: fromNode.id, to: toNode.id, style });
        break;
      }
    }
  }

  if (nodes.size === 0) return chalk.dim('  (empty diagram)');

  const lines2: string[] = [];

  // Render nodes
  for (const [, node] of nodes) {
    const shapeChar = { rect: '□', round: '○', circle: '◎', diamond: '◇', hex: '⬡' }[node.shape];
    lines2.push(`  ${chalk.cyan(shapeChar)} ${chalk.bold(node.label)} ${chalk.dim(`[${node.id}]`)}`);
  }

  lines2.push('');

  // Render edges
  for (const edge of edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    const arrow = { '-->': '──→', '---': '───', '-.->' : '··→', '==>': '══⇒', '~~>': '~~→' }[edge.style];
    const label = edge.label ? ` ${chalk.dim(`[${edge.label}]`)}` : '';
    lines2.push(`  ${chalk.bold(from.label)} ${chalk.yellow(arrow)} ${chalk.bold(to.label)}${label}`);
  }

  return lines2.join('\n');
}

function renderSequence(lines: string[]): string {
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    // participant declarations
    if (line.startsWith('participant ') || line.startsWith('actor ')) {
      const name = line.replace(/^(participant|actor)\s+/, '').replace(/\s+as\s+.+/, '');
      out.push(`  ${chalk.cyan('◉')} ${chalk.bold(name)}`);
      continue;
    }

    // Note
    if (line.startsWith('Note ')) {
      const m = line.match(/Note (?:over|left of|right of) (.+?):\s*(.+)/);
      if (m) {
        out.push(`  ${chalk.dim(`╔ Note (${m[1]}): ${m[2]} ╗`)}`);
      }
      continue;
    }

    // activate/deactivate
    if (line.startsWith('activate ') || line.startsWith('deactivate ')) continue;

    // loop/alt/else/end/opt/par
    if (/^(loop|alt|else|end|opt|par|and|critical|break|rect)\b/.test(line)) {
      const keyword = line.split(/\s+/)[0];
      const rest = line.slice(keyword.length).trim();
      out.push(`  ${chalk.magenta(keyword.toUpperCase())}${rest ? ` ${chalk.dim(rest)}` : ''}`);
      continue;
    }

    // Message arrows: A ->> B: text or A -> B: text
    const msgMatch = line.match(/^(.+?)\s*(-{1,2}>+|={1,2}>+|\.{1,2}>+)\s*(.+?):\s*(.+)$/);
    if (msgMatch) {
      const [, from, arrow, to, msg] = msgMatch;
      const isReturn = arrow.includes('--') || arrow.includes('..');
      const arr = isReturn ? chalk.dim('- - →') : chalk.yellow('────→');
      out.push(`  ${chalk.cyan(from.trim())} ${arr} ${chalk.cyan(to.trim())}: ${chalk.white(msg)}`);
      continue;
    }

    out.push(`  ${chalk.dim(line)}`);
  }

  return out.join('\n');
}

function renderPie(lines: string[]): string {
  const out: string[] = [];
  const entries: Array<{ label: string; value: number }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%') || line.startsWith('title')) continue;
    const m = line.match(/^"(.+?)"\s*:\s*([\d.]+)$/);
    if (m) entries.push({ label: m[1], value: parseFloat(m[2]) });
  }

  const total = entries.reduce((s, e) => s + e.value, 0);
  const maxWidth = 30;

  for (const { label, value } of entries) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    const barLen = Math.round((pct / 100) * maxWidth);
    const bar = chalk.cyan('█'.repeat(barLen)) + chalk.dim('░'.repeat(maxWidth - barLen));
    out.push(`  ${bar} ${chalk.bold(label)} ${chalk.yellow(pct.toFixed(1) + '%')}`);
  }

  return out.join('\n');
}

function renderGantt(lines: string[]): string {
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;
    if (line.startsWith('title ')) {
      out.push(`  ${chalk.bold(line.slice(6))}`);
      continue;
    }
    if (line.startsWith('section ')) {
      out.push(`  ${chalk.cyan('▸')} ${chalk.bold.underline(line.slice(8))}`);
      continue;
    }
    if (line.startsWith('dateFormat') || line.startsWith('axisFormat') || line.startsWith('excludes')) continue;

    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const taskName = parts[0];
      const tags = parts.slice(1).join(', ');
      const isActive = tags.includes('active');
      const isDone = tags.includes('done');
      const isCrit = tags.includes('crit');
      const icon = isDone ? chalk.green('✔') : isActive ? chalk.yellow('▶') : chalk.dim('○');
      const color = isCrit ? chalk.red : chalk.white;
      out.push(`    ${icon} ${color(taskName)}`);
    }
  }

  return out.join('\n');
}

function renderClassDiagram(lines: string[]): string {
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (line.startsWith('class ') && line.includes('{')) {
      const name = line.match(/^class\s+(\w+)/)?.[1] ?? '';
      out.push(`  ${chalk.cyan('◫')} ${chalk.bold(name)}`);
      continue;
    }

    const relMatch = line.match(/^(\w+)\s+([<|o*]?\.?\.-?[|>*o]+)\s+(\w+)(?:\s*:\s*(.+))?$/);
    if (relMatch) {
      const [, from, rel, to, label] = relMatch;
      out.push(`  ${chalk.bold(from)} ${chalk.yellow(rel)} ${chalk.bold(to)}${label ? chalk.dim(` : ${label}`) : ''}`);
      continue;
    }

    const memberMatch = line.match(/^\s+([+\-#~]?)(\w+)\s*(?:\(([^)]*)\))?\s*(?::\s*(\w+))?$/);
    if (memberMatch) {
      const [, vis, name, params, ret] = memberMatch;
      const visColor = { '+': chalk.green, '-': chalk.red, '#': chalk.yellow, '~': chalk.blue }[vis] ?? chalk.white;
      const isMethod = params !== undefined;
      out.push(`      ${visColor(vis || ' ')} ${isMethod ? chalk.cyan(name) + chalk.dim(`(${params ?? ''})`) : chalk.white(name)}${ret ? chalk.dim(`: ${ret}`) : ''}`);
      continue;
    }

    if (line !== '}') out.push(`  ${chalk.dim(line)}`);
  }

  return out.join('\n');
}

function renderStateDiagram(lines: string[]): string {
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;
    if (line === '[*]') continue;

    const transMatch = line.match(/^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/);
    if (transMatch) {
      const [, from, to, label] = transMatch;
      const fromStr = from === '[*]' ? chalk.green('●') : chalk.bold(from);
      const toStr = to === '[*]' ? chalk.red('◉') : chalk.bold(to);
      out.push(`  ${fromStr} ${chalk.yellow('──→')} ${toStr}${label ? chalk.dim(` : ${label}`) : ''}`);
      continue;
    }

    if (line.startsWith('state ')) {
      const m = line.match(/^state "?(.+?)"?\s+as\s+(\w+)/);
      if (m) out.push(`  ${chalk.cyan('◈')} ${chalk.bold(m[2])}: ${m[1]}`);
      continue;
    }

    out.push(`  ${chalk.dim(line)}`);
  }

  return out.join('\n');
}

export function renderMermaid(code: string): string {
  const w = getWidth() - 2;
  const lines = code.trim().split('\n');
  const firstLine = lines[0].trim().toLowerCase();

  let diagramType = '📊 Diagram';
  let content = '';

  if (firstLine.startsWith('graph') || firstLine.startsWith('flowchart')) {
    diagramType = firstLine.startsWith('graph lr') || firstLine.includes('lr') ? '→ Flowchart (LR)' :
      firstLine.includes('td') || firstLine.includes('tb') ? '↓ Flowchart (TD)' : '⬡ Flowchart';
    content = renderFlowchart(lines.slice(1));
  } else if (firstLine === 'sequencediagram') {
    diagramType = '↔ Sequence Diagram';
    content = renderSequence(lines.slice(1));
  } else if (firstLine.startsWith('pie')) {
    diagramType = '◔ Pie Chart';
    content = renderPie(lines.slice(1));
  } else if (firstLine.startsWith('gantt')) {
    diagramType = '▦ Gantt Chart';
    content = renderGantt(lines.slice(1));
  } else if (firstLine.startsWith('classdiagram')) {
    diagramType = '◫ Class Diagram';
    content = renderClassDiagram(lines.slice(1));
  } else if (firstLine.startsWith('statediagram')) {
    diagramType = '◈ State Diagram';
    content = renderStateDiagram(lines.slice(1));
  } else if (firstLine.startsWith('erdiagram')) {
    diagramType = '⊞ ER Diagram';
    content = lines.slice(1).map(l => `  ${chalk.dim(l)}`).join('\n');
  } else if (firstLine.startsWith('journey')) {
    diagramType = '↝ User Journey';
    content = lines.slice(1).map(l => `  ${l.trim()}`).join('\n');
  } else if (firstLine.startsWith('gitgraph') || firstLine.startsWith('gitflow')) {
    diagramType = '⎇ Git Graph';
    content = lines.slice(1).map(l => `  ${chalk.dim(l)}`).join('\n');
  } else {
    content = lines.slice(1).map(l => `  ${chalk.dim(l)}`).join('\n');
  }

  const topBorder = `╭─ ${chalk.bold.magenta('Mermaid')} ${chalk.dim(diagramType)} ${'─'.repeat(Math.max(2, w - diagramType.length - 14))}╮`;
  const bottomBorder = `╰${'─'.repeat(w - 1)}╯`;

  return `\n${topBorder}\n${content}\n${bottomBorder}\n`;
}
