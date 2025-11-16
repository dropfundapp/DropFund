const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:5174';
  console.log('Opening', url);
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the wallet adapter button
    await page.waitForSelector('.wallet-adapter-button', { timeout: 10000 });
    await page.click('.wallet-adapter-button');
    console.log('Clicked wallet button, waiting for modal...');

    // Wait for modal or dropdown that wallet adapter shows
    await page.waitForSelector('.wallet-adapter-modal-wrapper, .wallet-adapter-dropdown-list, .wallet-adapter-modal', { timeout: 10000 });
    console.log('Modal appeared, taking screenshot...');

    await page.screenshot({ path: 'connect-flow.png', fullPage: true });
    console.log('Screenshot saved to connect-flow.png');
  } catch (err) {
    console.error('Error during screenshot flow:', err);
    // Try to save a screenshot of the current state for debugging
    try {
      await page.screenshot({ path: 'connect-flow-error.png', fullPage: true });
      console.log('Saved error screenshot to connect-flow-error.png');
    } catch (e) {
      console.error('Failed to save error screenshot:', e);
    }
  } finally {
    await browser.close();
  }
})();
