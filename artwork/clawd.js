/**
 * ClawdRenderer - Pixel art renderer for the Claude Code Club mascot
 *
 * Based on the Claude Code terminal ASCII art:
 *    * ▐▛███▜▌ *
 *   * ▝▜█████▛▘ *
 *    *  ▘▘ ▝▝  *
 *
 * The ASCII uses Unicode block characters that only render in monospace fonts.
 * This renderer creates the equivalent pixel art for canvas display.
 */

class ClawdRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = canvas.width; // 32, 64, or 128

    // Disable smoothing for crisp pixels
    this.ctx.imageSmoothingEnabled = false;

    // Store pixel data for debugging/export
    this.pixelData = [];
  }

  // Draw a single pixel at grid position
  drawPixel(x, y, color) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, 1, 1);
    this.pixelData.push({ x, y, color });
  }

  // Draw a rectangle of pixels
  drawRect(x, y, width, height, color) {
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        this.drawPixel(px, py, color);
      }
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.pixelData = [];
  }

  render(traits) {
    this.clear();

    const scale = this.size / 32; // Scale factor from base 32x32

    // 1. Background
    this.drawBackground(traits.background, scale);

    // 2. Aura (behind character)
    if (traits.aura && traits.aura !== 'none') {
      this.drawAura(traits, scale);
    }

    // 3. Stars (behind character)
    this.drawStars(traits.starCount || 0, traits.starStyle || 'bright', scale);

    // 4. Main Clawd body
    this.drawClawd(traits, scale);
  }

  drawBackground(type, scale) {
    // Fill with dark background
    this.drawRect(0, 0, this.size, this.size, '#0a0a0f');

    if (type === 'stars') {
      const s = (n) => Math.floor(n * scale);
      const positions = [[3, 5], [28, 3], [5, 28], [26, 26], [15, 2], [2, 15], [29, 15]];
      positions.forEach(([x, y]) => {
        this.drawPixel(s(x), s(y), '#ffffff22');
      });
    } else if (type === 'nebula') {
      // Subtle purple/blue nebula effect
      const s = (n) => Math.floor(n * scale);
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 32);
        const y = Math.floor(Math.random() * 32);
        this.drawPixel(s(x), s(y), i % 2 === 0 ? '#8b5cf611' : '#00d4aa11');
      }
    } else if (type === 'galaxy') {
      const s = (n) => Math.floor(n * scale);
      // More stars + color
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 32);
        const y = Math.floor(Math.random() * 32);
        const colors = ['#ffffff15', '#8b5cf615', '#00d4aa15', '#ec489915'];
        this.drawPixel(s(x), s(y), colors[i % colors.length]);
      }
    }
  }

  drawAura(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const color = traits.bodyColor || '#00d4aa';

    const alphas = {
      faint: '18',
      strong: '35',
      blazing: '55'
    };

    const alpha = alphas[traits.aura] || '00';
    const auraColor = color + alpha;

    // Draw glow matching Clawd's shape
    const cx = 16;
    const cy = 15;
    const padding = traits.aura === 'blazing' ? 3 : traits.aura === 'strong' ? 2 : 1;

    // Aura around body area
    this.drawRect(s(cx - 6 - padding), s(cy - 5 - padding),
                  s(12 + padding * 2), s(12 + padding * 2), auraColor);
  }

  drawStars(count, style, scale) {
    const s = (n) => Math.floor(n * scale);

    // Star positions matching the ASCII layout: * around the character
    // ASCII shows stars at: top-left, top-right, mid-left, mid-right, bottom area
    const positions = [
      [4, 9],    // left of ears
      [27, 9],   // right of ears
      [3, 14],   // mid left
      [28, 14],  // mid right
      [5, 21],   // bottom left
      [26, 21],  // bottom right
      [8, 5],    // upper area
      [24, 5],   // upper area
    ];

    const colors = {
      dim: '#ffffff44',
      bright: '#ffffff99',
      glowing: '#ffffffcc',
      radiant: '#ffffff'
    };

    const starColor = colors[style] || colors.bright;

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const [x, y] = positions[i];
      this.drawPixel(s(x), s(y), starColor);

      // For glowing/radiant, add cross sparkle at larger scales
      if (scale >= 2 && (style === 'glowing' || style === 'radiant')) {
        const dimColor = starColor.slice(0, 7) + '55';
        this.drawPixel(s(x) - 1, s(y), dimColor);
        this.drawPixel(s(x) + 1, s(y), dimColor);
        this.drawPixel(s(x), s(y) - 1, dimColor);
        this.drawPixel(s(x), s(y) + 1, dimColor);
      }
    }
  }

  drawClawd(traits, scale) {
    const color = traits.bodyColor || '#00d4aa';
    const starColor = traits.starColor || '#ffffff';

    // ════════════════════════════════════════════════════════════════
    // EXACT ASCII from Claude Code terminal - rendered with fillText()
    //
    //     * ▐▛███▜▌ *
    //    * ▝▜█████▛▘ *
    //     *  ▘▘ ▝▝  *
    // ════════════════════════════════════════════════════════════════

    // The exact ASCII with stars
    const asciiWithStars = [
      '   * ▐▛███▜▌ *',
      '  * ▝▜█████▛▘ *',
      '   *  ▘▘ ▝▝  *'
    ];

    // Just the body (for coloring separately if needed)
    const asciiBody = [
      '     ▐▛███▜▌  ',
      '    ▝▜█████▛▘ ',
      '      ▘▘ ▝▝   '
    ];

    // Star positions (for separate coloring)
    const asciiStars = [
      '   *          *',
      '  *            *',
      '   *          *'
    ];

    const sizeMultiplier = {
      spark: 0.7,
      coder: 0.85,
      hacker: 1.0,
      architect: 1.1,
      legend: 1.2
    }[traits.stage] || 1.0;

    // Font size - scale to fit canvas
    const fontSize = Math.floor(this.size / 5 * sizeMultiplier);
    const fontFamily = 'Consolas, "Fira Code", "IBM Plex Mono", "Courier New", monospace';

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const lineHeight = fontSize * 1.0;
    const startY = (this.size - 3 * lineHeight) / 2 + lineHeight / 2;
    const centerX = this.size / 2;

    // Aura effect (if enabled)
    if (traits.aura && traits.aura !== 'none') {
      const auraIntensity = { faint: 5, strong: 15, blazing: 30 }[traits.aura] || 0;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = auraIntensity;
    }

    // Draw body in trait color
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = color;
    for (let i = 0; i < asciiBody.length; i++) {
      this.ctx.fillText(asciiBody[i], centerX, startY + i * lineHeight);
    }

    // Reset shadow for stars
    this.ctx.shadowBlur = 0;

    // Draw stars (if star count > 0)
    if (traits.starCount > 0) {
      this.ctx.fillStyle = starColor;
      // Render stars with varying opacity based on style
      const starOpacity = { dim: 0.4, bright: 0.7, glowing: 0.9, radiant: 1.0 }[traits.starStyle] || 0.7;
      this.ctx.globalAlpha = starOpacity;

      for (let i = 0; i < asciiStars.length; i++) {
        this.ctx.fillText(asciiStars[i], centerX, startY + i * lineHeight);
      }

      this.ctx.globalAlpha = 1.0;
    }
  }

  // Export pixel data as ASCII for debugging (matches the Unicode art)
  getPixelDataString() {
    const gridSize = 32;
    const scale = this.size / gridSize;

    const grid = [];
    for (let y = 0; y < gridSize; y++) {
      let row = '';
      for (let x = 0; x < gridSize; x++) {
        const pixel = this.pixelData.find(p => {
          const px = Math.floor(p.x / scale);
          const py = Math.floor(p.y / scale);
          return px === x && py === y;
        });

        if (pixel) {
          if (pixel.color === '#0a0a0f') {
            row += ' ';
          } else if (pixel.color.startsWith('#ffffff') || pixel.color.startsWith('#fff')) {
            row += '*';
          } else if (pixel.color.length === 9) {
            row += '.'; // Aura
          } else {
            row += '█';
          }
        } else {
          row += ' ';
        }
      }
      grid.push(row);
    }

    return grid.join('\n');
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClawdRenderer;
}
