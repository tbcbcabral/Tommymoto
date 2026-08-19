const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    if (request.url().includes('powersync') || request.url().includes('supabase')) {
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    }
  });

  try {
    await page.goto('https://tbcbcabral.github.io/Tommymoto/', { waitUntil: 'load', timeout: 30000 });
    console.log("Page loaded");
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (e) {
    console.error("Navigation error:", e);
  }
  
  await browser.close();
})();
