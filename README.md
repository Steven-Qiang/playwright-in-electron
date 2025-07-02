# Introducing playwright-in-electron
Use playwright to test and control your electron application.
```
npm install playwright-in-electron playwright-core electron
```

See the [API documentation](/API.md).

# JavaScript
```javascript
const {BrowserWindow, app} = require("electron");
const wie = require("playwright-in-electron")
const playwright = require("playwright-core");

const main = async () => {
  await wie.initialize(app);
  const browser = await wie.connect(app, playwright);
 
  const window = new BrowserWindow();
  const url = "https://example.com/";
  await window.loadURL(url);
 
  const page = await wie.getPage(browser, window);
  console.log(page.url());
  window.destroy();
};

main();
```

# TypeScript
```typescript
import {BrowserWindow, app} from "electron";
import wie from "playwright-in-electron";
import playwright from "playwright-core";

const main = async () => {
  await wie.initialize(app);
  const browser = await wie.connect(app, playwright);

  const window = new BrowserWindow();
  const url = "https://example.com/";
  await window.loadURL(url);

  const page = await wie.getPage(browser, window);
  console.log(page.url());
  window.destroy();
};

main();
```
