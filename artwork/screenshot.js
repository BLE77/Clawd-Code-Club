const { chromium } = require('playwright');
const path = require('path');

async function capturePreview() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load the local preview file
  const previewPath = path.join(__dirname, 'preview.html');
  await page.goto(`file://${previewPath}`);

  // Wait for canvas to render
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({
    path: path.join(__dirname, 'preview-screenshot.png'),
    fullPage: true
  });

  console.log('Screenshot saved to preview-screenshot.png');
  await browser.close();
}

capturePreview().catch(console.error);
