const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    protocolTimeout: 120000,
    headless: 'new'
  });
  const page = await browser.newPage();
  
  const htmlPath = path.join(__dirname, 'poster.html');
  const pngPath = path.join(__dirname, 'poster.png');
  
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 60000 });
  
  // Wait for QR code to render
  await page.waitForSelector('#qr-poster', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Screenshot the poster element
  const poster = await page.$('.poster');
  await poster.screenshot({ path: pngPath });
  
  await browser.close();
  console.log('Poster generated: poster.png');
})();
