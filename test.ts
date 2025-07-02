import { BrowserWindow, app } from 'electron';
import wie from './index';
import playwright from 'playwright-core';

const main = async () => {
  await wie.initialize(app);
  const browser = await wie.connect(app, playwright);

  const window = new BrowserWindow();
  const url = 'https://example.com/';
  await window.loadURL(url);

  const page = await wie.getPage(browser, window);
  console.log(page.url());
  window.destroy();
};

main();
