/**
 * ClawdRenderer - Pixel art renderer for the Claude Code Club mascot
 *
 * Clawd is based on the Claude Code terminal mascot:
 * - Chunky, solid teal body
 * - Two small rectangular ears on top (with gap between)
 * - Two white square eyes (holes/gaps in the body)
 * - Small arm nubs on the sides
 * - Two small separated feet at the bottom
 * - White stars floating around
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

    // Helper to scale coordinates
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale)); // Scale width (min 1)

    // ⛧ DEVIL FULL 1/1 - Override body to blood red!
    if (traits.hat === 'devil-full') {
      traits = { ...traits, bodyColor: '#cc0000' };
    }

    // 1. Background
    this.drawBackground(traits.background, scale);

    // 2. Stars
    this.drawStars(traits.starCount, traits.starStyle, scale);

    // 4. Hat back layer (hoodie goes behind head)
    if (traits.hat === 'hoodie') {
      this.drawHoodieBack(traits, scale);
    }

    // 5. Main Clawd body
    this.drawClawd(traits, scale);

    // 6. Hat front layer
    if (traits.hat === 'hoodie') {
      this.drawHoodieFront(traits, scale);
    } else if (traits.hat === 'wizard') {
      this.drawWizardHat(traits, scale);
    } else if (traits.hat === 'crown') {
      this.drawCrownHat(traits, scale);
    } else if (traits.hat === 'cap') {
      this.drawCap(traits, scale);
    } else if (traits.hat === 'devil') {
      this.drawDevilHorns(traits, scale);
    } else if (traits.hat === 'devil-full') {
      this.drawDevilFull(traits, scale);
    }

    // 7. Shoes
    if (traits.shoes && traits.shoes !== 'none') {
      this.drawShoes(traits, scale);
    }
  }

  drawBackground(type, scale) {
    // Fill with dark background
    this.drawRect(0, 0, this.size, this.size, '#0a0a0f');

    if (type === 'stars') {
      const s = (n) => Math.floor(n * scale);
      // Add some dim background stars
      const positions = [[3, 5], [28, 3], [5, 28], [26, 26], [15, 2], [2, 15], [29, 15]];
      positions.forEach(([x, y]) => {
        this.drawPixel(s(x), s(y), '#ffffff22');
      });
    }
  }

  drawStars(count, style, scale) {
    const s = (n) => Math.floor(n * scale);

    // Star positions around Clawd (matching Claude Code layout style)
    // Positioned to frame the character nicely
    const positions = [
      [5, 8],    // top left
      [26, 6],   // top right
      [3, 16],   // mid left
      [28, 14],  // mid right
      [4, 24],   // bottom left
      [27, 22],  // bottom right
      [10, 4],   // upper left
      [22, 26],  // lower right
    ];

    const colors = {
      dim: '#ffffff55',
      bright: '#ffffffaa',
      glowing: '#ffffffdd',
      radiant: '#ffffff'
    };

    const starColor = colors[style] || colors.bright;

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const [x, y] = positions[i];
      this.drawPixel(s(x), s(y), starColor);

      // For brighter stars, add a tiny cross effect at larger scales
      if (scale >= 2 && (style === 'glowing' || style === 'radiant')) {
        const dimColor = starColor.slice(0, 7) + '66';
        this.drawPixel(s(x) - 1, s(y), dimColor);
        this.drawPixel(s(x) + 1, s(y), dimColor);
        this.drawPixel(s(x), s(y) - 1, dimColor);
        this.drawPixel(s(x), s(y) + 1, dimColor);
      }
    }
  }

  drawClawd(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));
    const color = traits.bodyColor;
    const bgColor = '#0a0a0f'; // For eyes (holes in body)

    // ════════════════════════════════════════════════════════════════
    // CLAWD PIXEL ART - Based on Claude Code mascot
    //
    // 32x32 grid, Clawd centered around (16, 16)
    //
    // Key features from reference:
    // - Chunky solid body (teal by default)
    // - Two ears on top with gap between them
    // - Two square eyes (actually HOLES showing background)
    // - Small arm nubs on sides
    // - Two feet at bottom with gap between
    // ════════════════════════════════════════════════════════════════

    const cx = 16; // center x
    const cy = 16; // center y

    // Fixed size (no stage-based scaling)
    const sz = (n) => n;

    // ── EARS ──────────────────────────────────────────────────
    // Two ears on top, with gap between them
    // Left ear: 3 pixels wide, 3 pixels tall
    const earWidth = sw(sz(3));
    const earHeight = sw(sz(3));
    const earGap = sw(sz(4)); // Gap between ears
    const earY = s(cy - sz(8)); // Top of ears

    // Left ear
    this.drawRect(s(cx - sz(4)), earY, earWidth, earHeight, color);
    // Right ear
    this.drawRect(s(cx + sz(1)), earY, earWidth, earHeight, color);

    // ── MAIN BODY (HEAD) ──────────────────────────────────────
    // Wider rectangle below the ears
    const bodyWidth = sw(sz(12));
    const bodyHeight = sw(sz(8));
    const bodyY = earY + earHeight - sw(1); // Overlap slightly with ears
    const bodyX = s(cx - sz(6));

    this.drawRect(bodyX, bodyY, bodyWidth, bodyHeight, color);

    // ── EYES (HOLES IN THE BODY) ──────────────────────────────
    // Eyes are gaps/holes showing background, not white pixels
    // They're positioned in the upper portion of the body
    const eyeWidth = sw(sz(2));
    const eyeHeight = sw(sz(2));
    const eyeY = bodyY + sw(sz(2));

    // Simple square eyes (holes)
    // Left eye
    this.drawRect(s(cx - sz(4)), eyeY, eyeWidth, eyeHeight, bgColor);
    // Right eye
    this.drawRect(s(cx + sz(2)), eyeY, eyeWidth, eyeHeight, bgColor);

    // ── ARM NUBS ──────────────────────────────────────────────
    // Small protrusions on the sides of the body
    const armY = bodyY + sw(sz(3));
    const armWidth = sw(sz(2));
    const armHeight = sw(sz(3));

    // Left arm nub
    this.drawRect(bodyX - armWidth, armY, armWidth, armHeight, color);
    // Right arm nub
    this.drawRect(bodyX + bodyWidth, armY, armWidth, armHeight, color);

    // ── FEET ──────────────────────────────────────────────────
    // Two small rectangles at bottom with gap between
    const feetY = bodyY + bodyHeight;
    const footWidth = sw(sz(3));
    const footHeight = sw(sz(2));
    const footGap = sw(sz(4)); // Gap between feet

    // Left foot
    this.drawRect(s(cx - sz(4)), feetY, footWidth, footHeight, color);
    // Right foot
    this.drawRect(s(cx + sz(1)), feetY, footWidth, footHeight, color);
  }

  // ════════════════════════════════════════════════════════════════
  // HAT RENDERING
  // Hats that Clawd can wear: hoodie, beanie, cap
  // ════════════════════════════════════════════════════════════════

  drawHoodieBack(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    // Hoodie color - darker shade based on body color
    const hoodieColor = this.darkenColor(traits.bodyColor, 0.5);

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;

    // Tight-fitting hood that hugs the head
    // Based on user's design:
    //     █▀▀▀▀▀▀▀▌
    //   ▟██▐▛███▜▌▌

    const earY = s(cy - sz(8));

    // Hood top - flat bar above the ears (█▀▀▀▀▀▀▀▌)
    this.drawRect(s(cx - sz(5)), earY - sw(sz(2)), sw(sz(10)), sw(sz(2)), hoodieColor);

    // Left side of hood wrapping down (▟██)
    this.drawRect(s(cx - sz(7)), earY - sw(sz(1)), sw(sz(2)), sw(sz(6)), hoodieColor);
    // Extra pixel for the ▟ shape
    this.drawPixel(s(cx - sz(6)), earY - sw(sz(2)), hoodieColor);

    // Right side of hood (▌)
    this.drawRect(s(cx + sz(5)), earY - sw(sz(1)), sw(sz(2)), sw(sz(6)), hoodieColor);
  }

  drawHoodieFront(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    // Hoodie color - darker shade
    const hoodieColor = this.darkenColor(traits.bodyColor, 0.5);
    const stringColor = '#ffffff88';

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;

    const earY = s(cy - sz(8));
    const earHeight = sw(sz(3));
    const bodyY = earY + earHeight - sw(1);

    // Hoodie drawstrings hanging from neck area
    const stringY = bodyY + sw(sz(2));
    this.drawPixel(s(cx - sz(2)), stringY, stringColor);
    this.drawPixel(s(cx - sz(2)), stringY + sw(1), stringColor);
    this.drawPixel(s(cx + sz(1)), stringY, stringColor);
    this.drawPixel(s(cx + sz(1)), stringY + sw(1), stringColor);
  }

  drawWizardHat(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    const hatColor = '#4a2c7a'; // Purple wizard hat
    const starColor = '#ffd700'; // Gold stars on hat

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;
    const earY = s(cy - sz(8));

    // Wizard hat - pointed cone shape
    // Wide brim at bottom
    this.drawRect(s(cx - sz(6)), earY - sw(sz(1)), sw(sz(12)), sw(sz(1)), hatColor);

    // Cone going up - getting narrower
    this.drawRect(s(cx - sz(4)), earY - sw(sz(3)), sw(sz(8)), sw(sz(2)), hatColor);
    this.drawRect(s(cx - sz(3)), earY - sw(sz(5)), sw(sz(6)), sw(sz(2)), hatColor);
    this.drawRect(s(cx - sz(2)), earY - sw(sz(7)), sw(sz(4)), sw(sz(2)), hatColor);
    this.drawRect(s(cx - sz(1)), earY - sw(sz(9)), sw(sz(2)), sw(sz(2)), hatColor);

    // Star decoration on hat
    this.drawPixel(s(cx), earY - sw(sz(6)), starColor);
  }

  drawCrownHat(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    const crownColor = '#ffd700'; // Gold crown
    const gemColor = '#ff3366';   // Red gems

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;
    const earY = s(cy - sz(8));

    // Crown base
    this.drawRect(s(cx - sz(5)), earY - sw(sz(2)), sw(sz(10)), sw(sz(2)), crownColor);

    // Crown points (3 points)
    this.drawRect(s(cx - sz(4)), earY - sw(sz(4)), sw(sz(2)), sw(sz(2)), crownColor);
    this.drawRect(s(cx - sz(1)), earY - sw(sz(5)), sw(sz(2)), sw(sz(3)), crownColor); // Middle taller
    this.drawRect(s(cx + sz(2)), earY - sw(sz(4)), sw(sz(2)), sw(sz(2)), crownColor);

    // Gem in center
    this.drawPixel(s(cx), earY - sw(sz(3)), gemColor);
  }

  drawCap(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    const capColor = this.darkenColor(traits.bodyColor, 0.5);

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;
    const earY = s(cy - sz(8));

    // Cap crown
    this.drawRect(s(cx - sz(4)), earY - sw(sz(2)), sw(sz(8)), sw(sz(2)), capColor);

    // Cap brim extending to the right
    const brimColor = this.darkenColor(traits.bodyColor, 0.3);
    this.drawRect(s(cx + sz(2)), earY - sw(sz(1)), sw(sz(5)), sw(sz(1)), brimColor);
  }

  // DEVIL HORNS - ALWAYS RED
  drawDevilHorns(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    // ALWAYS blood red - never changes
    const hornColor = '#cc0000';
    const hornHighlight = '#ff3333';
    const hornDark = '#880000';

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;
    const earY = s(cy - sz(8));

    // Left horn - triangular ▲
    this.drawPixel(s(cx - sz(5)), earY - sw(sz(5)), hornHighlight);  // Tip
    this.drawRect(s(cx - sz(6)), earY - sw(sz(4)), sw(sz(2)), sw(sz(1)), hornColor);
    this.drawRect(s(cx - sz(7)), earY - sw(sz(3)), sw(sz(3)), sw(sz(1)), hornColor);
    this.drawRect(s(cx - sz(7)), earY - sw(sz(2)), sw(sz(3)), sw(sz(2)), hornDark);

    // Right horn - triangular ▲
    this.drawPixel(s(cx + sz(4)), earY - sw(sz(5)), hornHighlight);  // Tip
    this.drawRect(s(cx + sz(4)), earY - sw(sz(4)), sw(sz(2)), sw(sz(1)), hornColor);
    this.drawRect(s(cx + sz(4)), earY - sw(sz(3)), sw(sz(3)), sw(sz(1)), hornColor);
    this.drawRect(s(cx + sz(4)), earY - sw(sz(2)), sw(sz(3)), sw(sz(2)), hornDark);
  }

  // ⛧ DEVIL FULL - RARE 1/1 - HORNS + ALL SYMBOLS ⛧
  //    ⛧   ▲   ▲ ⛧
  //  ⛧    ▐▛███▜▌ Ψ⛧
  //    ◄─▝▜█████▛▘⎦
  //  ⛧     ▘▘ ▝▝ ⛧
  drawDevilFull(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    // Blood red theme
    const hornColor = '#cc0000';
    const hornHighlight = '#ff3333';
    const hornDark = '#880000';
    const symbolColor = '#ff0000';
    const symbolDim = '#aa0000';

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;
    const earY = s(cy - sz(8));
    const bodyY = earY + sw(sz(3)) - sw(1);
    const feetY = bodyY + sw(sz(8));

    // Draw the horns first (same as regular devil)
    // Left horn ▲
    this.drawPixel(s(cx - sz(5)), earY - sw(sz(5)), hornHighlight);
    this.drawRect(s(cx - sz(6)), earY - sw(sz(4)), sw(sz(2)), sw(sz(1)), hornColor);
    this.drawRect(s(cx - sz(7)), earY - sw(sz(3)), sw(sz(3)), sw(sz(1)), hornColor);
    this.drawRect(s(cx - sz(7)), earY - sw(sz(2)), sw(sz(3)), sw(sz(2)), hornDark);

    // Right horn ▲
    this.drawPixel(s(cx + sz(4)), earY - sw(sz(5)), hornHighlight);
    this.drawRect(s(cx + sz(4)), earY - sw(sz(4)), sw(sz(2)), sw(sz(1)), hornColor);
    this.drawRect(s(cx + sz(4)), earY - sw(sz(3)), sw(sz(3)), sw(sz(1)), hornColor);
    this.drawRect(s(cx + sz(4)), earY - sw(sz(2)), sw(sz(3)), sw(sz(2)), hornDark);

    // ⛧ Pentagram symbols around the character
    // Top left ⛧
    this.drawPentagram(s(cx - sz(10)), earY - sw(sz(4)), sw(sz(1)), symbolColor);
    // Top right ⛧
    this.drawPentagram(s(cx + sz(9)), earY - sw(sz(4)), sw(sz(1)), symbolColor);
    // Mid left ⛧
    this.drawPentagram(s(cx - sz(11)), bodyY, sw(sz(1)), symbolDim);
    // Mid right Ψ (psi symbol - single pixel representation)
    this.drawPixel(s(cx + sz(10)), bodyY, symbolColor);
    this.drawPixel(s(cx + sz(10)), bodyY + sw(1), symbolColor);
    this.drawPixel(s(cx + sz(9)), bodyY - sw(1), symbolDim);
    this.drawPixel(s(cx + sz(11)), bodyY - sw(1), symbolDim);
    // Far right ⛧
    this.drawPentagram(s(cx + sz(12)), bodyY, sw(sz(1)), symbolColor);
    // Bottom left ⛧
    this.drawPentagram(s(cx - sz(10)), feetY, sw(sz(1)), symbolDim);
    // Bottom right ⛧
    this.drawPentagram(s(cx + sz(10)), feetY, sw(sz(1)), symbolDim);

    // ◄─ Arrow on left side of body
    this.drawPixel(s(cx - sz(9)), bodyY + sw(sz(3)), symbolColor);
    this.drawPixel(s(cx - sz(8)), bodyY + sw(sz(3)), symbolDim);
    this.drawPixel(s(cx - sz(10)), bodyY + sw(sz(2)), symbolDim);
    this.drawPixel(s(cx - sz(10)), bodyY + sw(sz(4)), symbolDim);

    // ⎦ Bracket on right side
    this.drawPixel(s(cx + sz(9)), bodyY + sw(sz(2)), symbolColor);
    this.drawPixel(s(cx + sz(9)), bodyY + sw(sz(3)), symbolColor);
    this.drawPixel(s(cx + sz(9)), bodyY + sw(sz(4)), symbolColor);
    this.drawPixel(s(cx + sz(8)), bodyY + sw(sz(4)), symbolDim);
  }

  // Helper to draw a small pentagram symbol ⛧
  drawPentagram(x, y, size, color) {
    // Simplified pentagram as a small star/cross pattern
    this.drawPixel(x, y, color);
    this.drawPixel(x - size, y, color);
    this.drawPixel(x + size, y, color);
    this.drawPixel(x, y - size, color);
    this.drawPixel(x, y + size, color);
  }

  // ════════════════════════════════════════════════════════════════
  // SHOES RENDERING
  // Slides, Crocs, Heels, Jordans 🔥
  // ════════════════════════════════════════════════════════════════

  drawShoes(traits, scale) {
    const s = (n) => Math.floor(n * scale);
    const sw = (n) => Math.max(1, Math.floor(n * scale));

    const cx = 16;
    const cy = 16;

    const sz = (n) => n;

    // Calculate feet position (same as in drawClawd)
    const earY = s(cy - sz(8));
    const earHeight = sw(sz(3));
    const bodyY = earY + earHeight - sw(1);
    const bodyHeight = sw(sz(8));
    const feetY = bodyY + bodyHeight;

    // Shoe colors - follow body color but can have accents
    const shoeColor = this.darkenColor(traits.bodyColor, 0.6);
    const shoeHighlight = this.darkenColor(traits.bodyColor, 0.8);

    if (traits.shoes === 'slides') {
      // Slides: ═▘ ▝═
      // Flat straps over the feet
      const slideColor = shoeColor;
      // Left slide
      this.drawRect(s(cx - sz(5)), feetY, sw(sz(3)), sw(sz(1)), slideColor);
      this.drawRect(s(cx - sz(4)), feetY + sw(sz(1)), sw(sz(2)), sw(sz(1)), slideColor);
      // Right slide
      this.drawRect(s(cx + sz(2)), feetY, sw(sz(3)), sw(sz(1)), slideColor);
      this.drawRect(s(cx + sz(2)), feetY + sw(sz(1)), sw(sz(2)), sw(sz(1)), slideColor);
    }

    else if (traits.shoes === 'crocs') {
      // Crocs: ⊏▘ ▝⊐
      // Rounded clogs with holes
      const crocColor = shoeColor;
      const holeColor = '#0a0a0f';
      // Left croc
      this.drawRect(s(cx - sz(5)), feetY, sw(sz(3)), sw(sz(2)), crocColor);
      this.drawPixel(s(cx - sz(4)), feetY, holeColor); // Croc hole
      // Right croc
      this.drawRect(s(cx + sz(2)), feetY, sw(sz(3)), sw(sz(2)), crocColor);
      this.drawPixel(s(cx + sz(3)), feetY, holeColor); // Croc hole
    }

    else if (traits.shoes === 'heels') {
      // High Heels: ▘▚ ▞▝
      // Elevated heel at back
      const heelColor = shoeColor;
      // Left heel - foot part + heel
      this.drawRect(s(cx - sz(4)), feetY, sw(sz(2)), sw(sz(1)), heelColor);
      this.drawRect(s(cx - sz(5)), feetY + sw(sz(1)), sw(sz(1)), sw(sz(2)), heelColor); // Heel
      // Right heel - foot part + heel
      this.drawRect(s(cx + sz(2)), feetY, sw(sz(2)), sw(sz(1)), heelColor);
      this.drawRect(s(cx + sz(4)), feetY + sw(sz(1)), sw(sz(1)), sw(sz(2)), heelColor); // Heel
    }

    else if (traits.shoes === 'jordans') {
      // Jordans 🔥: ▄█▘ ▝█▄
      // Fresh kicks with colored tips
      const jordanMain = shoeColor;

      // Tip color based on body color:
      // - Diamond body (#00d4aa) → Diamond tips
      // - Gold body (#eab308, #ffd700) → Gold tips
      // - Normal colors → White tips
      let tipColor = '#ffffff'; // Default white for normal people
      const bodyLower = traits.bodyColor.toLowerCase();
      if (bodyLower === '#00d4aa') {
        tipColor = '#00d4aa'; // Diamond
      } else if (bodyLower === '#eab308' || bodyLower === '#ffd700') {
        tipColor = '#ffd700'; // Gold
      }

      // Left Jordan - chunky sneaker
      this.drawRect(s(cx - sz(5)), feetY - sw(sz(1)), sw(sz(1)), sw(sz(1)), tipColor); // Tip accent
      this.drawRect(s(cx - sz(5)), feetY, sw(sz(3)), sw(sz(2)), jordanMain);
      this.drawPixel(s(cx - sz(3)), feetY - sw(sz(1)), jordanMain); // Top of shoe

      // Right Jordan - chunky sneaker
      this.drawRect(s(cx + sz(4)), feetY - sw(sz(1)), sw(sz(1)), sw(sz(1)), tipColor); // Tip accent
      this.drawRect(s(cx + sz(2)), feetY, sw(sz(3)), sw(sz(2)), jordanMain);
      this.drawPixel(s(cx + sz(2)), feetY - sw(sz(1)), jordanMain); // Top of shoe
    }
  }

  // Helper to darken a hex color
  darkenColor(hex, factor) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Darken
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);

    // Convert back to hex
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // Export pixel data as ASCII for debugging
  getPixelDataString() {
    // Create a simple ASCII representation for 32x32
    const gridSize = 32;
    const scale = this.size / gridSize;

    // Build a 32x32 grid regardless of canvas size
    const grid = [];
    for (let y = 0; y < gridSize; y++) {
      let row = '';
      for (let x = 0; x < gridSize; x++) {
        // Check if there's a pixel at this scaled position
        const pixel = this.pixelData.find(p => {
          const px = Math.floor(p.x / scale);
          const py = Math.floor(p.y / scale);
          return px === x && py === y;
        });

        if (pixel) {
          // Check what kind of pixel it is
          if (pixel.color === '#0a0a0f') {
            row += ' '; // Background (including eye holes)
          } else if (pixel.color.startsWith('#ffffff') || pixel.color.startsWith('#fff')) {
            row += '*'; // Star
          } else if (pixel.color.length === 9 && pixel.color.endsWith('15') ||
                     pixel.color.endsWith('30') || pixel.color.endsWith('50')) {
            row += '.'; // Aura
          } else {
            row += '█'; // Body
          }
        } else {
          row += ' ';
        }
      }
      grid.push(row);
    }

    // Trim empty rows from top and bottom, but keep structure visible
    return grid.join('\n');
  }
}

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClawdRenderer;
}
