import chalk from 'chalk';
import { getWidth } from './utils.js';

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
  'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
  'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'n': 'ₙ', 'o': 'ₒ',
  'r': 'ᵣ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ',
};

const SYMBOLS: Record<string, string> = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
  '\\theta': 'θ', '\\vartheta': 'ϑ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
  '\\pi': 'π', '\\varpi': 'ϖ', '\\rho': 'ρ', '\\varrho': 'ϱ',
  '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
  '\\phi': 'φ', '\\varphi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
  '\\Epsilon': 'Ε', '\\Zeta': 'Ζ', '\\Eta': 'Η', '\\Theta': 'Θ',
  '\\Iota': 'Ι', '\\Kappa': 'Κ', '\\Lambda': 'Λ', '\\Mu': 'Μ',
  '\\Nu': 'Ν', '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Rho': 'Ρ',
  '\\Sigma': 'Σ', '\\Tau': 'Τ', '\\Upsilon': 'Υ', '\\Phi': 'Φ',
  '\\Chi': 'Χ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  '\\sum': 'Σ', '\\int': '∫', '\\iint': '∬', '\\iiint': '∭',
  '\\oint': '∮', '\\prod': '∏', '\\coprod': '∐',
  '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇', '\\hbar': 'ℏ',
  '\\ell': 'ℓ', '\\wp': '℘', '\\Re': 'ℜ', '\\Im': 'ℑ', '\\aleph': 'ℵ',
  '\\pm': '±', '\\mp': '∓', '\\times': '×', '\\div': '÷',
  '\\cdot': '·', '\\ast': '∗', '\\star': '⋆', '\\circ': '∘',
  '\\bullet': '•', '\\oplus': '⊕', '\\ominus': '⊖',
  '\\otimes': '⊗', '\\oslash': '⊘', '\\odot': '⊙',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
  '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡',
  '\\sim': '∼', '\\simeq': '≃', '\\cong': '≅', '\\propto': '∝',
  '\\ll': '≪', '\\gg': '≫', '\\prec': '≺', '\\succ': '≻',
  '\\preceq': '≼', '\\succeq': '≽',
  '\\forall': '∀', '\\exists': '∃', '\\nexists': '∄',
  '\\in': '∈', '\\notin': '∉', '\\ni': '∋',
  '\\subset': '⊂', '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇',
  '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅', '\\varnothing': '∅',
  '\\rightarrow': '→', '\\to': '→', '\\leftarrow': '←', '\\gets': '←',
  '\\Rightarrow': '⇒', '\\Leftarrow': '⇐',
  '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔',
  '\\uparrow': '↑', '\\downarrow': '↓', '\\updownarrow': '↕',
  '\\nearrow': '↗', '\\searrow': '↘', '\\swarrow': '↙', '\\nwarrow': '↖',
  '\\mapsto': '↦', '\\longmapsto': '⟼',
  '\\ldots': '…', '\\cdots': '⋯', '\\vdots': '⋮', '\\ddots': '⋱',
  '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥', '\\nparallel': '∦',
  '\\langle': '⟨', '\\rangle': '⟩', '\\lceil': '⌈', '\\rceil': '⌉',
  '\\lfloor': '⌊', '\\rfloor': '⌋',
  '\\{': '{', '\\}': '}', '\\|': '‖',
  '\\land': '∧', '\\lor': '∨', '\\lnot': '¬', '\\neg': '¬',
  '\\top': '⊤', '\\bot': '⊥',
  '\\therefore': '∴', '\\because': '∵',
  '\\sqrt': '√',
  '\\infin': '∞',
};

function convertMath(expr: string): string {
  let r = expr.trim();

  // \frac{a}{b}
  r = r.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

  // \sqrt[n]{x}
  r = r.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '$1√($2)');
  r = r.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  r = r.replace(/\\sqrt(?!\{)([a-zA-Z0-9])/g, '√$1');

  // \overline{x}, \hat{x}, \tilde{x}, \vec{x}
  r = r.replace(/\\overline\{([^}]+)\}/g, '$1̄');
  r = r.replace(/\\hat\{([^}]+)\}/g, '$1̂');
  r = r.replace(/\\tilde\{([^}]+)\}/g, '$1̃');
  r = r.replace(/\\vec\{([^}]+)\}/g, '$1⃗');

  // Replace known symbols (longest first to avoid partial replacement)
  const sortedSymbols = Object.entries(SYMBOLS).sort((a, b) => b[0].length - a[0].length);
  for (const [sym, rep] of sortedSymbols) {
    r = r.split(sym).join(rep);
  }

  // Superscripts: ^{...} or ^x
  r = r.replace(/\^\{([^}]+)\}/g, (_, g) =>
    [...g].map(c => SUPERSCRIPTS[c] ?? c).join('')
  );
  r = r.replace(/\^([0-9a-zA-Z+\-=()])/g, (_, c) =>
    SUPERSCRIPTS[c] ?? `^${c}`
  );

  // Subscripts: _{...} or _x
  r = r.replace(/_\{([^}]+)\}/g, (_, g) =>
    [...g].map(c => SUBSCRIPTS[c] ?? c).join('')
  );
  r = r.replace(/_([0-9a-zA-Z+\-=()])/g, (_, c) =>
    SUBSCRIPTS[c] ?? `_${c}`
  );

  // Remove unknown backslash commands
  r = r.replace(/\\[a-zA-Z]+[*]?/g, '');

  // Clean up
  r = r.replace(/[{}]/g, '');
  r = r.replace(/\s+/g, ' ').trim();

  return r;
}

export function renderBlockMath(expr: string): string {
  const converted = convertMath(expr);
  const w = getWidth() - 4;
  const line = '─'.repeat(Math.max(8, Math.min(w, converted.length + 4)));
  return `\n  ${chalk.yellow(line)}\n  ${chalk.bold.yellow(converted)}\n  ${chalk.yellow(line)}\n`;
}

export function renderInlineMath(expr: string): string {
  return chalk.yellow(convertMath(expr));
}

export function processMath(text: string): string {
  // Block math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, e) => renderBlockMath(e));
  // Inline math $...$
  text = text.replace(/\$([^$\n]+?)\$/g, (_, e) => renderInlineMath(e));
  return text;
}
