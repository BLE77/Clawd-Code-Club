/**
 * Dynamic Clawd NFT Artwork Generator
 *
 * Generates HTML artwork based on trait values.
 * Can be used to create both static PNG and animated HTML versions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load xterm.js and CSS for inlining (makes HTML self-contained for IPFS)
let XTERM_JS = '';
let XTERM_CSS = '';

try {
  XTERM_JS = fs.readFileSync(path.join(__dirname, 'xterm.min.js'), 'utf-8');
  XTERM_CSS = fs.readFileSync(path.join(__dirname, 'xterm.min.css'), 'utf-8');
} catch (e) {
  console.warn('Warning: xterm files not found, HTML will use CDN fallback');
}

// ============================================================================
// Trait Mappings (matching achievement-engine.ts)
// ============================================================================

// Color palette (matching preview.html)
export const COLOR_PALETTE = {
  purple: { hex: '#8b5cf6', name: 'Purple', rarity: 'common' },
  pink: { hex: '#ec4899', name: 'Pink', rarity: 'common' },
  green: { hex: '#22c55e', name: 'Green', rarity: 'common' },
  white: { hex: '#ffffff', name: 'White', rarity: 'common' },
  orange: { hex: '#f97316', name: 'Orange', rarity: 'uncommon' },
  blue: { hex: '#3b82f6', name: 'Blue', rarity: 'uncommon' },
  red: { hex: '#ef4444', name: 'Red', rarity: 'uncommon' },
  silver: { hex: '#b0b0c0', name: 'Silver', rarity: 'uncommon' },
  gold: { hex: '#eab308', name: 'Gold', rarity: 'rare' },
  diamond: { hex: '#00d4aa', name: 'Diamond', rarity: 'rare' },
};

export const COLOR_NAMES = ['purple', 'pink', 'green', 'white', 'orange', 'blue', 'red', 'silver', 'gold', 'diamond'];

// Default Clawd color (used when no specific color is set)
const DEFAULT_BODY_COLOR = '#00d4aa';

// Background colors (black, navy, white)
export const BACKGROUND_COLORS = {
  black: '#000000',
  navy: '#0a0a1a',  // Darker, more navy like Cursor
  white: '#ffffff',
};

// Star style characters (matching preview.html)
export const STAR_CHARS = {
  bright: '*',    // Stars ✦
  swords: '⚔',    // Swords
  music: '♪',     // Music (randomly ♪♫𝄞)
  none: ' ',      // None
  unholy: '⸸',    // Unholy
  goth: '☠',      // Goth (randomly ☠🕷🕸)
  bitcoin: '₿',   // Bitcoin
  diamonds: '◆',  // Diamonds
  adult: '18₊',   // 18+ (1/1 combo)
};

// Star styles that need smaller font size (multi-character)
export const SMALL_STAR_STYLES = ['adult'];

export const STAR_NAMES = ['bright', 'swords', 'music', 'none', 'unholy', 'goth', 'bitcoin', 'diamonds'];

// Hat names for reference
export const HAT_NAMES = ['none', 'cap', 'tophat', 'antenna', 'headphones', 'flowercrown', 'beanie', 'wizardhat', 'cowboy', 'devil', 'halo', 'crown', 'hoodie'];

// Hat ASCII art - WITH positioning spaces (+3 to center with body)
export const HAT_ASCII = {
  none: [],
  tophat: [
    '           █▀▀▀█',
    '          ▀▀▀▀▀▀▀'
  ],
  crown: ['            ♛'],
  wizardhat: [
    '             ∧',
    '            /✦\\',
    '           /✦ ✦\\'
  ],
  cap: [
    '           ┌──╮',
    '           └──┘───'
  ],
  devil: ['           ▲   ▲'],
  halo: ['             ○'],
  antenna: [
    '             ⚆',
    '             │'
  ],
  headphones: [
    '          ╭─────╮',
    '          ◖     ◗'
  ],
  cowboy: [
    '          ╭─────╮',
    '         ═╧═════╧═'
  ],
  flowercrown: ['          ✿ ❀ ✿ ❀'],
  beanie: [
    '          ╭─────╮',
    '          │▓▓▓▓▓│'
  ],
  hoodie: null, // Special case - modifies body
  'devil-full': null, // 1/1 special
  'ble77': null, // 1/1 special
};

// Simple single-line hat for static PNG (from preview.html - ASCII only)
export const HAT_SIMPLE = {
  none: '',
  cap: '┌──╮',         // Cap (first line of cap ASCII)
  tophat: '█▀▀▀█',     // Top hat
  antenna: '⚆',        // Antenna
  headphones: '╭─────╮', // Headphones
  flowercrown: '✿ ❀ ✿ ❀', // Flower crown
  beanie: '╭─────╮',   // Beanie
  wizardhat: '∧',      // Wizard hat tip
  cowboy: '╭─────╮',   // Cowboy hat
  devil: '▲   ▲',      // Devil horns (two triangles)
  halo: '○',           // Halo
  crown: '♛',          // Crown
  hoodie: '',          // Hoodie modifies body, no separate hat
};

// Hand item characters (matching preview.html)
export const HAND_CHARS = {
  none: '',
  peace: '✌︎',
  pen: '✎',
  microphone: '🎙',
  coffee: '☕︎',
  phone: '🖥',
  rolex: '⏱',
  adult: '(๏人๏)', // 1/1 - shortened to fit 32-col terminal
};

export const HAND_NAMES = ['none', 'peace', 'pen', 'microphone', 'coffee', 'phone', 'rolex', 'adult'];

// Shoe characters (matching preview.html)
export const SHOE_CHARS = {
  none: '▘▘ ▝▝',      // Barefoot (default)
  slides: '═▘ ▝═',    // Slides
  crocs: '⊏▘ ▝⊐',     // Crocs
  heels: '▘▚ ▞▝',     // High Heels
  dress: '◤◥ ◤◥',     // Dress Shoes
  jordans: '▄█ █▄',   // Jordans
};

export const SHOE_NAMES = ['none', 'slides', 'crocs', 'heels', 'dress', 'jordans'];

// ============================================================================
// HTML Template Generators
// ============================================================================

/**
 * Get color hex from color name, hex value, or color object
 */
function getColorHex(color) {
  if (!color) return DEFAULT_BODY_COLOR;
  // If it's an object with hex property (from traits.js)
  if (typeof color === 'object' && color.hex) return color.hex;
  // If it's already a hex color string, return it
  if (typeof color === 'string' && color.startsWith('#')) return color;
  // Look up in palette by name (string key)
  if (typeof color === 'string' && COLOR_PALETTE[color]) return COLOR_PALETTE[color].hex;
  return DEFAULT_BODY_COLOR;
}

/**
 * Helper to convert hex color to RGB for ANSI escape codes
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * Generate ANSI escape code for a color
 */
function ansiColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `\\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Generate the static PNG HTML template using xterm.js
 *
 * Traits object should have string keys matching preview.html:
 * - bodyColor: 'purple', 'gold', '#8b5cf6', etc.
 * - starStyle: 'bright', 'swords', 'music', 'diamonds', etc.
 * - starColor: color name or hex
 * - hat: 'none', 'crown', 'tophat', 'wizardhat', etc.
 * - hatColor: color name or hex
 * - shoes: 'none', 'slides', 'crocs', 'heels', 'jordans'
 * - shoeColor: color name or hex
 * - hand: 'none', 'peace', 'coffee', 'rolex', etc.
 * - handColor: color name or hex
 */
export function generateStaticHTML(traits) {
  const bodyColor = getColorHex(traits.bodyColor);
  // Background color
  const bgColor = BACKGROUND_COLORS[traits.background] || BACKGROUND_COLORS.black;
  const textColor = traits.background === 'white' ? '#000000' : '#ffffff';
  // 1/1 combo: adult hand forces 18+ stars
  const hand = traits.hand || 'none';
  const starStyle = (hand === 'adult') ? 'adult' : (traits.starStyle || 'bright');
  const starChar = STAR_CHARS[starStyle] || '*';
  // Bitcoin stars are ALWAYS gold, diamonds are ALWAYS teal - see preview.html lines 501-502, 619-628
  const starColor = starStyle === 'bitcoin' ? '#ffd700' :
                    starStyle === 'diamonds' ? '#00d4aa' :
                    (getColorHex(traits.starColor) || bodyColor);
  const hat = traits.hat || 'none';
  const hatLines = HAT_ASCII[hat] || [];
  // Devil horns are ALWAYS red (#cc0000) - see preview.html line 572
  const hatColor = hat === 'devil' ? '#cc0000' : (getColorHex(traits.hatColor) || '#eab308');
  const shoes = traits.shoes || 'none';
  const shoeColor = getColorHex(traits.shoeColor) || bodyColor;
  const handChar = HAND_CHARS[hand] || '';
  const handColor = getColorHex(traits.handColor) || bodyColor;

  // Build the feet line based on shoes
  const feetChars = SHOE_CHARS[shoes] || SHOE_CHARS.none;

  // Build RGB values for JavaScript
  const bodyRgb = hexToRgb(bodyColor);
  const starRgb = hexToRgb(starColor);
  const hatRgb = hexToRgb(hatColor);
  const shoeRgb = hexToRgb(shoeColor);
  const handRgb = hexToRgb(handColor);

  // Escape special characters for JavaScript strings
  const escapeJS = (str) => str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

  // Font size - 28px for bigger Clawd
  const fontSize = 28;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=512, height=512">
  <title>Clawd NFT</title>
  <style>
    /* Inlined xterm.css for IPFS compatibility */
    ${XTERM_CSS}
  </style>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 512px;
      height: 512px;
      overflow: hidden;
      background: ${bgColor};
    }

    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    #terminal {
      width: 480px;
      height: 260px;
      overflow: hidden;
    }

    /* Hide xterm scrollbar */
    .xterm-viewport::-webkit-scrollbar {
      display: none;
    }
    .xterm-viewport {
      scrollbar-width: none;
      overflow: hidden !important;
    }

    .terminal-prompt {
      margin-top: 30px;
      width: 320px;
    }

    .terminal-line {
      height: 2px;
      background: ${traits.background === 'white' ? '#808080' : '#3a4a5a'};
    }

    .prompt-row {
      display: flex;
      align-items: center;
      padding: 12px 0;
      font-size: 18px;
      font-family: "Cascadia Code", Consolas, monospace;
    }

    .prompt-arrow {
      color: ${traits.background === 'white' ? '#404040' : '#4a5a6a'};
      margin-right: 8px;
    }

    .cursor {
      width: 10px;
      height: 18px;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div id="terminal"></div>

  <div class="terminal-prompt">
    <div class="terminal-line"></div>
    <div class="prompt-row">
      <span class="prompt-arrow">></span>
      <div class="cursor"></div>
    </div>
    <div class="terminal-line"></div>
  </div>

  <script>
    // Inlined xterm.js for IPFS compatibility
    ${XTERM_JS}
  </script>
  <script>
    const term = new Terminal({
      cols: 40,
      rows: 9,
      theme: {
        background: '${bgColor}',
        foreground: '${textColor}',
        cursor: '${bgColor}'
      },
      fontFamily: '"Cascadia Code", Consolas, monospace',
      fontSize: ${fontSize},
      lineHeight: 1.0,
      cursorBlink: false
    });

    term.open(document.getElementById('terminal'));

    // ANSI color helpers
    function ansi(r, g, b) {
      return '\\x1b[38;2;' + r + ';' + g + ';' + b + 'm';
    }
    const reset = '\\x1b[0m';

    // Colors
    const bodyAnsi = ansi(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b});
    const starAnsi = ansi(${starRgb.r}, ${starRgb.g}, ${starRgb.b});
    const hatAnsi = ansi(${hatRgb.r}, ${hatRgb.g}, ${hatRgb.b});
    const shoeAnsi = ansi(${shoeRgb.r}, ${shoeRgb.g}, ${shoeRgb.b});
    const handAnsi = ansi(${handRgb.r}, ${handRgb.g}, ${handRgb.b});

    // Star character
    const starChar = '${escapeJS(starChar)}';
    // Hand character (replaces right star on line 2 if present)
    const handChar = '${escapeJS(handChar)}';
    // Feet characters
    const feetChars = '${escapeJS(feetChars)}';
    // Hat lines (array)
    const hatLines = ${JSON.stringify(hatLines)};
    const maxHatHeight = 3; // Wizard hat is tallest

    // Calculate padding needed to keep body at fixed position
    const hatHeight = hatLines.length;
    const paddingNeeded = maxHatHeight - hatHeight;

    // Row 0: always empty
    term.writeln('');

    // Add padding before hat to keep body position consistent
    for (let i = 0; i < paddingNeeded; i++) {
      term.writeln('');
    }

    // Render hat lines (if any) - padding is built into the hat strings
    hatLines.forEach(line => {
      term.writeln(hatAnsi + line + reset);
    });

    // Body line 1: star body star (top line) - 8 spaces to center
    term.writeln('        ' + starAnsi + starChar + reset + ' ' + bodyAnsi + '\\u2590\\u259B\\u2588\\u2588\\u2588\\u259C\\u258C' + reset + ' ' + starAnsi + starChar + reset);

    // Body line 2: star body (hand or star) - 7 spaces to center
    const rightChar2 = handChar ? (handAnsi + handChar) : (starAnsi + starChar);
    term.writeln('       ' + starAnsi + starChar + reset + ' ' + bodyAnsi + '\\u259D\\u259C\\u2588\\u2588\\u2588\\u2588\\u2588\\u259B\\u2598' + reset + ' ' + rightChar2 + reset);

    // Body line 3: star feet star - 8 spaces to center
    term.writeln('        ' + starAnsi + starChar + reset + '  ' + shoeAnsi + feetChars + reset + '  ' + starAnsi + starChar + reset);
  </script>
</body>
</html>`;
}

/**
 * Generate the animated HTML template (for animation_url)
 * Uses EXACT same rendering as static, just with animated wrapper
 */
export function generateAnimatedHTML(traits, tokenId = '0000') {
  const bodyColor = getColorHex(traits.bodyColor);
  // Background color
  const bgColor = BACKGROUND_COLORS[traits.background] || BACKGROUND_COLORS.black;
  const textColor = traits.background === 'white' ? '#000000' : '#ffffff';
  // 1/1 combo: adult hand forces 18+ stars
  const hand = traits.hand || 'none';
  const starStyle = (hand === 'adult') ? 'adult' : (traits.starStyle || 'bright');
  const starChar = STAR_CHARS[starStyle] || '*';
  // Bitcoin stars are ALWAYS gold, diamonds are ALWAYS teal - see preview.html lines 501-502, 619-628
  const starColor = starStyle === 'bitcoin' ? '#ffd700' :
                    starStyle === 'diamonds' ? '#00d4aa' :
                    (getColorHex(traits.starColor) || bodyColor);
  const hat = traits.hat || 'none';
  const hatLines = HAT_ASCII[hat] || [];
  // Devil horns are ALWAYS red (#cc0000) - see preview.html line 572
  const hatColor = hat === 'devil' ? '#cc0000' : (getColorHex(traits.hatColor) || '#eab308');
  const shoes = traits.shoes || 'none';
  const shoeColor = getColorHex(traits.shoeColor) || bodyColor;
  const handChar = HAND_CHARS[hand] || '';
  const handColor = getColorHex(traits.handColor) || bodyColor;
  const rarityName = traits.rarityName || 'COMMON';
  const feetChars = SHOE_CHARS[shoes] || SHOE_CHARS.none;

  // Build RGB values for JavaScript
  const bodyRgb = hexToRgb(bodyColor);
  const starRgb = hexToRgb(starColor);
  const hatRgb = hexToRgb(hatColor);
  const shoeRgb = hexToRgb(shoeColor);
  const handRgb = hexToRgb(handColor);

  // Escape special characters for JavaScript strings
  const escapeJS = (str) => str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');

  // Font size - 28px for bigger Clawd
  const fontSize = 28;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=512, height=512">
  <title>Clawd #${tokenId}</title>
  <style>
    /* Inlined xterm.css for IPFS compatibility */
    ${XTERM_CSS}
  </style>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      min-width: 512px;
      min-height: 512px;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${bgColor};
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .terminal-wrapper {
      width: 512px;
      height: 512px;
      display: flex;
      flex-direction: column;
      position: relative;
      flex-shrink: 0;
    }

    .terminal-header {
      height: 32px;
      background: #1a1a25;
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 8px;
      border-bottom: 1px solid #2a2a3a;
    }

    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.red { background: #ff5f56; }
    .dot.yellow { background: #ffbd2e; }
    .dot.green { background: #27ca40; }

    .terminal-title {
      color: #606070;
      font-size: 12px;
      margin-left: 8px;
    }

    .terminal-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .clawd-art {
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    #terminal {
      width: 480px;
      height: 260px;
      overflow: hidden;
    }

    /* Hide xterm scrollbar */
    .xterm-viewport::-webkit-scrollbar {
      display: none;
    }
    .xterm-viewport {
      scrollbar-width: none;
      overflow: hidden !important;
    }

    .terminal-prompt {
      margin-top: 20px;
      width: 320px;
    }

    .terminal-line {
      height: 2px;
      background: ${traits.background === 'white' ? '#808080' : '#3a4a5a'};
    }

    .prompt-row {
      display: flex;
      align-items: center;
      padding: 12px 0;
      font-size: 18px;
      font-family: "Cascadia Code", Consolas, monospace;
    }

    .prompt-arrow {
      color: ${traits.background === 'white' ? '#404040' : '#4a5a6a'};
      margin-right: 8px;
    }

    .cursor {
      width: 10px;
      height: 18px;
      background: #ffffff;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

  </style>
</head>
<body>
  <div class="terminal-wrapper">
    <div class="terminal-header">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
      <span class="terminal-title">clawd_#${tokenId}.exe</span>
    </div>

    <div class="terminal-body">
      <div class="clawd-art">
        <div id="terminal"></div>
      </div>

      <div class="terminal-prompt">
        <div class="terminal-line"></div>
        <div class="prompt-row">
          <span class="prompt-arrow">></span>
          <div class="cursor"></div>
        </div>
        <div class="terminal-line"></div>
      </div>
    </div>

  </div>

  <script>
    // Inlined xterm.js for IPFS compatibility
    ${XTERM_JS}
  </script>
  <script>
    // EXACT same terminal config as static
    const term = new Terminal({
      cols: 40,
      rows: 9,
      theme: {
        background: '${bgColor}',
        foreground: '${textColor}',
        cursor: '${bgColor}'
      },
      fontFamily: '"Cascadia Code", Consolas, monospace',
      fontSize: ${fontSize},
      lineHeight: 1.0,
      cursorBlink: false
    });

    term.open(document.getElementById('terminal'));

    // ANSI color helpers
    function ansi(r, g, b) {
      return '\\x1b[38;2;' + r + ';' + g + ';' + b + 'm';
    }
    const reset = '\\x1b[0m';

    // Colors - EXACT same as static
    const bodyAnsi = ansi(${bodyRgb.r}, ${bodyRgb.g}, ${bodyRgb.b});
    const starAnsi = ansi(${starRgb.r}, ${starRgb.g}, ${starRgb.b});
    const hatAnsi = ansi(${hatRgb.r}, ${hatRgb.g}, ${hatRgb.b});
    const shoeAnsi = ansi(${shoeRgb.r}, ${shoeRgb.g}, ${shoeRgb.b});
    const handAnsi = ansi(${handRgb.r}, ${handRgb.g}, ${handRgb.b});

    // Star character
    const starChar = '${escapeJS(starChar)}';
    // Hand character (replaces right star on line 2 if present)
    const handChar = '${escapeJS(handChar)}';
    // Feet characters
    const feetChars = '${escapeJS(feetChars)}';
    // Hat lines (array)
    const hatLines = ${JSON.stringify(hatLines)};
    const maxHatHeight = 3; // Wizard hat is tallest

    // Calculate padding needed to keep body at fixed position
    const hatHeight = hatLines.length;
    const paddingNeeded = maxHatHeight - hatHeight;

    // Row 0: always empty
    term.writeln('');

    // Add padding before hat to keep body position consistent
    for (let i = 0; i < paddingNeeded; i++) {
      term.writeln('');
    }

    // Render hat lines (if any) - padding is built into the hat strings
    hatLines.forEach(line => {
      term.writeln(hatAnsi + line + reset);
    });

    // Body line 1: star body star (top line) - 8 spaces to center
    term.writeln('        ' + starAnsi + starChar + reset + ' ' + bodyAnsi + '\\u2590\\u259B\\u2588\\u2588\\u2588\\u259C\\u258C' + reset + ' ' + starAnsi + starChar + reset);

    // Body line 2: star body (hand or star) - 7 spaces to center
    const rightChar2 = handChar ? (handAnsi + handChar) : (starAnsi + starChar);
    term.writeln('       ' + starAnsi + starChar + reset + ' ' + bodyAnsi + '\\u259D\\u259C\\u2588\\u2588\\u2588\\u2588\\u2588\\u259B\\u2598' + reset + ' ' + rightChar2 + reset);

    // Body line 3: star feet star - 8 spaces to center
    term.writeln('        ' + starAnsi + starChar + reset + '  ' + shoeAnsi + feetChars + reset + '  ' + starAnsi + starChar + reset);
  </script>
</body>
</html>`;
}

/**
 * Example traits following the ACTUAL rarity scoring system from preview.html
 *
 * SCORING:
 * - Body: Common=0, Uncommon=2, Gold=4, Diamond=5
 * - Stars: Common=0, Uncommon=2, bitcoin=5, diamonds=6
 * - Hat: none=0, cap/tophat=1, wizardhat=2, devil=3, hoodie=4, halo/crown=5, 1/1=15
 * - Hand: Common=0, coffee=1, phone=2, rolex=4, adult=15
 * - Shoes: none=0, slides/crocs=1, heels/dress=2, jordans=4
 *
 * TIERS: Common(0-5), Uncommon(6-11), Rare(12-19), Epic(20-29), Legendary(30+)
 */
export const EXAMPLE_TRAITS = {
  // COMMON (0-5 pts): Purple(0) + bright(0) + none(0) + none(0) + none(0) = 0 pts
  common: {
    bodyColor: 'purple',
    starStyle: 'bright',
    starColor: 'white',
    hat: 'none',
    hatColor: 'purple',
    shoes: 'none',
    shoeColor: 'purple',
    hand: 'none',
    background: 'black',
    rarityName: 'Common',
  },

  // COMMON (5 pts): Pink(0) + swords(0) + cap(1) + peace(0) + jordans(4) = 5 pts
  commonMax: {
    bodyColor: 'pink',
    starStyle: 'swords',
    starColor: 'pink',
    hat: 'cap',
    hatColor: 'white',
    shoes: 'jordans',
    shoeColor: 'white',
    hand: 'peace',
    background: 'navy',
    rarityName: 'Common',
  },

  // UNCOMMON (9 pts): Orange(2) + unholy(2) + devil(3) + none(0) + heels(2) = 9 pts
  uncommon: {
    bodyColor: 'orange',
    starStyle: 'unholy',
    starColor: 'red',
    hat: 'devil',
    hatColor: 'red',
    shoes: 'heels',
    shoeColor: 'orange',
    hand: 'none',
    background: 'black',
    rarityName: 'Uncommon',
  },

  // UNCOMMON (8 pts): Blue(2) + music(0) + wizardhat(2) + phone(2) + dress(2) = 8 pts
  wizard: {
    bodyColor: 'blue',
    starStyle: 'music',
    starColor: 'blue',
    hat: 'wizardhat',
    hatColor: 'purple',
    shoes: 'dress',
    shoeColor: 'blue',
    hand: 'phone',
    background: 'white',
    rarityName: 'Uncommon',
  },

  // RARE (14 pts): Gold(4) + bitcoin(5) + tophat(1) + none(0) + jordans(4) = 14 pts
  rare: {
    bodyColor: 'gold',
    starStyle: 'bitcoin',
    starColor: 'gold',
    hat: 'tophat',
    hatColor: 'gold',
    shoes: 'jordans',
    shoeColor: 'gold',
    hand: 'none',
    background: 'navy',
    rarityName: 'Rare',
  },

  // RARE (17 pts): Diamond(5) + diamonds(6) + cap(1) + coffee(1) + jordans(4) = 17 pts
  rareDiamond: {
    bodyColor: 'diamond',
    starStyle: 'diamonds',
    starColor: 'diamond',
    hat: 'cap',
    hatColor: 'diamond',
    shoes: 'jordans',
    shoeColor: 'diamond',
    hand: 'coffee',
    background: 'black',
    rarityName: 'Rare',
  },

  // EPIC (24 pts): Diamond(5) + diamonds(6) + crown(5) + rolex(4) + jordans(4) = 24 pts
  epic: {
    bodyColor: 'diamond',
    starStyle: 'diamonds',
    starColor: 'diamond',
    hat: 'crown',
    hatColor: 'gold',
    shoes: 'jordans',
    shoeColor: 'diamond',
    hand: 'rolex',
    background: 'navy',
    rarityName: 'Epic',
  },

  // EPIC (20 pts): Gold(4) + diamonds(6) + halo(5) + coffee(1) + jordans(4) = 20 pts
  epicHalo: {
    bodyColor: 'gold',
    starStyle: 'diamonds',
    starColor: 'gold',
    hat: 'halo',
    hatColor: 'white',
    shoes: 'jordans',
    shoeColor: 'gold',
    hand: 'coffee',
    background: 'white',
    rarityName: 'Epic',
  },

  // LEGENDARY (30 pts): Diamond(5) + diamonds(6) + crown(5) + adult hand(15) + jordans(4) = 35 pts
  // Note: adult hand is the 1/1 trait that pushes this to legendary
  legendary: {
    bodyColor: 'diamond',
    starStyle: 'diamonds', // ◆ diamonds work visually
    starColor: 'diamond',
    hat: 'crown',
    hatColor: 'gold',
    shoes: 'jordans',
    shoeColor: 'diamond',
    hand: 'adult',         // 1/1 hand: ( ๏ 人 ๏ )
    handColor: 'diamond',
    background: 'black',
    rarityName: 'Legendary',
  },
};

// For command-line testing
if (typeof process !== 'undefined' && process.argv[1]?.includes('artwork-generator')) {
  const traitName = process.argv[2] || 'legend';
  const traits = EXAMPLE_TRAITS[traitName] || EXAMPLE_TRAITS.legend;

  console.log('=== Static HTML ===');
  console.log(generateStaticHTML(traits));
  console.log('\n=== Animated HTML ===');
  console.log(generateAnimatedHTML(traits, '0042'));
}
