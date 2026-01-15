/**
 * Generate PNG and HTML artwork for Clawd NFTs
 *
 * Uses Playwright to capture the dynamically generated HTML as 512x512 PNG.
 * Can generate multiple variants based on different trait combinations.
 *
 * Usage:
 *   node generate-png-preview.js              # Generate all example variants
 *   node generate-png-preview.js legend       # Generate specific variant
 *   node generate-png-preview.js --traits '{"bodyColor":16764108}'  # Custom traits JSON
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  generateStaticHTML,
  generateAnimatedHTML,
  EXAMPLE_TRAITS,
} from './artwork-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate PNG from HTML content
 */
async function generatePNG(browser, htmlContent, outputPath) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 512, height: 512 });

  // Load HTML content directly
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Wait for xterm.js to fully initialize and render
  // xterm.js needs time to load the font and render the terminal
  await page.waitForTimeout(2500);

  // Wait for terminal canvas to be present
  try {
    await page.waitForSelector('canvas.xterm-text-layer', { timeout: 5000 });
  } catch (e) {
    // If no canvas found, it might be using different rendering - wait a bit more
    await page.waitForTimeout(500);
  }

  // Capture as PNG
  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 512, height: 512 },
  });

  await page.close();
  return outputPath;
}

/**
 * Generate both PNG and HTML files for a trait set
 */
async function generateArtwork(browser, traits, name, tokenId = '0000') {
  const basePath = path.join(__dirname, 'generated');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  // Generate static HTML and PNG
  const staticHTML = generateStaticHTML(traits);
  const staticHTMLPath = path.join(basePath, `${name}-static.html`);
  fs.writeFileSync(staticHTMLPath, staticHTML);

  const pngPath = path.join(basePath, `${name}-512.png`);
  await generatePNG(browser, staticHTML, pngPath);

  // Generate animated HTML
  const animatedHTML = generateAnimatedHTML(traits, tokenId);
  const animatedHTMLPath = path.join(basePath, `${name}-animated.html`);
  fs.writeFileSync(animatedHTMLPath, animatedHTML);

  return { pngPath, staticHTMLPath, animatedHTMLPath };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('========================================');
  console.log('Clawd NFT Artwork Generator');
  console.log('========================================\n');

  console.log('Launching browser...');
  const browser = await chromium.launch();

  try {
    // Check for custom traits JSON
    const traitsIndex = args.indexOf('--traits');
    if (traitsIndex !== -1 && args[traitsIndex + 1]) {
      const customTraits = JSON.parse(args[traitsIndex + 1]);
      const name = args[0] !== '--traits' ? args[0] : 'custom';

      console.log(`Generating artwork for custom traits: ${name}`);
      const result = await generateArtwork(browser, customTraits, name);

      console.log(`\nGenerated:`);
      console.log(`  PNG: ${result.pngPath}`);
      console.log(`  Static HTML: ${result.staticHTMLPath}`);
      console.log(`  Animated HTML: ${result.animatedHTMLPath}`);
    }
    // Check for specific variant
    else if (args[0] && EXAMPLE_TRAITS[args[0]]) {
      const name = args[0];
      const traits = EXAMPLE_TRAITS[name];
      const tokenId = String(Math.floor(Math.random() * 9999)).padStart(4, '0');

      console.log(`Generating artwork for: ${name}`);
      const result = await generateArtwork(browser, traits, name, tokenId);

      console.log(`\nGenerated:`);
      console.log(`  PNG: ${result.pngPath}`);
      console.log(`  Static HTML: ${result.staticHTMLPath}`);
      console.log(`  Animated HTML: ${result.animatedHTMLPath}`);
    }
    // Generate all example variants
    else {
      console.log('Generating all example variants...\n');

      for (const [name, traits] of Object.entries(EXAMPLE_TRAITS)) {
        const tokenId = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
        console.log(`  Generating: ${name}...`);
        await generateArtwork(browser, traits, name, tokenId);
      }

      console.log(`\nGenerated ${Object.keys(EXAMPLE_TRAITS).length} variants in: ${path.join(__dirname, 'generated')}`);
    }

    // Also generate the default preview files
    console.log('\nUpdating default preview files...');

    const defaultTraits = {
      bodyColor: 'diamond',
      starStyle: 'diamonds',
      starColor: 'diamond',
      hat: 'crown',
      hatColor: 'gold',
      shoes: 'jordans',
      shoeColor: 'diamond',
      rarityName: 'Legendary',
    };

    const staticHTML = generateStaticHTML(defaultTraits);
    fs.writeFileSync(path.join(__dirname, 'nft-preview.html'), staticHTML);

    const animatedHTML = generateAnimatedHTML(defaultTraits, '0042');
    fs.writeFileSync(path.join(__dirname, 'animation-url-preview.html'), animatedHTML);

    // Generate main preview PNG
    await generatePNG(browser, staticHTML, path.join(__dirname, 'clawd-preview-512.png'));
    console.log('  Updated: clawd-preview-512.png');

    // Generate animation preview PNG
    const animPage = await browser.newPage();
    await animPage.setViewportSize({ width: 512, height: 512 });
    await animPage.setContent(animatedHTML, { waitUntil: 'networkidle' });
    await animPage.waitForTimeout(1000);
    await animPage.screenshot({
      path: path.join(__dirname, 'clawd-animation-preview.png'),
      type: 'png',
    });
    await animPage.close();
    console.log('  Updated: clawd-animation-preview.png');

  } finally {
    await browser.close();
  }

  console.log('\nDone!');
}

main().catch(console.error);
