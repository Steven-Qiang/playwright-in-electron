import getPort from 'get-port';

type App = import('electron').App;
type BrowserWindow = import('electron').BrowserWindow;
type BrowserView = import('electron').BrowserView;
type PlaywrightBrowser = import('playwright-core').Browser;
type PlaywrightPage = import('playwright-core').Page;
type Playwright = typeof import('playwright-core');

function getUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Initialize the electron app to accept playwright/DevTools connections.
 * Must be called at startup before the electron app is ready.
 * @param {App} app The app imported from electron.
 * @param {number} port Port to host the DevTools websocket connection.
 */
export const initialize = async (app: App, port: number = 0): Promise<void> => {
  if (!app) {
    throw new Error("The parameter 'app' was not passed in.  This may indicate that you are running in node rather than electron.");
  }

  if (app.isReady()) {
    throw new Error('Must be called at startup before the electron app is ready.');
  }

  if (port < 0 || port > 65535) {
    throw new Error(`Invalid port ${port}.`);
  }

  if (app.commandLine.getSwitchValue('remote-debugging-port')) {
    throw new Error('The electron application is already listening on a port. Double `initialize`?');
  }

  const actualPort = port === 0 ? await getPort({ host: '127.0.0.1' }) : port;
  app.commandLine.appendSwitch('remote-debugging-port', `${actualPort}`);
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  const electronMajor = parseInt(app.getVersion().split('.')[0], 10);
  // NetworkService crashes in electron 6.
  if (electronMajor >= 7) {
    app.commandLine.appendSwitch('enable-features', 'NetworkService');
  }
};

/**
 * Connects playwright to the electron app. Must call {@link initialize} before connecting.
 * When connecting multiple times, you use the same port.
 * @param {App} app The app imported from electron.
 * @param {Playwright} playwright The imported playwright namespace.
 * @returns {Promise<Browser>} An object containing the playwright browser, the port, and json received from DevTools.
 */
export const connect = async (app: App, playwright: Playwright): Promise<PlaywrightBrowser> => {
  if (!playwright) {
    throw new Error("The parameter 'playwright' was not passed in.");
  }

  const port = app.commandLine.getSwitchValue('remote-debugging-port');
  if (!port) {
    throw new Error('The electron application was not setup to listen on a port. Was `initialize` called at startup?');
  }

  await app.whenReady();

  const browser = await playwright.chromium.connectOverCDP(`http://127.0.1:${port}`);
  return browser;
};

/**
 * Given a BrowserWindow, find the corresponding playwright Page. It is undefined if external operations
 * occur on the page whilst we are attempting to find it. A url/file must be loaded on the window for it to be found.
 * If no url is loaded, the parameter 'allowBlankNavigate' allows us to load "about:blank" first.
 * @param {Browser} browser The playwright browser instance obtained from calling |connect|.
 * @param {BrowserWindow} window The browser window for which we want to find the corresponding playwright Page.
 * @param {boolean} allowBlankNavigate If no url is loaded, allow us to load "about:blank" so that we may find the Page.
 * @returns {Promise<Page>} The page that corresponds with the BrowserWindow.
 */
export const getPage = async (browser: PlaywrightBrowser, window: BrowserWindow | BrowserView, allowBlankNavigate: boolean = true): Promise<PlaywrightPage> => {
  if (!browser) {
    throw new Error("The parameter 'browser' was not passed in.");
  }

  if (!window) {
    throw new Error("The parameter 'window' was not passed in.");
  }

  if (window.webContents.getURL() === '') {
    if (allowBlankNavigate) {
      await window.webContents.loadURL('about:blank');
    } else {
      throw new Error('In order to get the playwright Page, we must be able to execute JavaScript which requires the window having loaded a URL.');
    }
  }

  const guid = getUuid();

  await window.webContents.executeJavaScript(`window.playwright_guid = "${guid}"`);
  
  const pages = browser
    .contexts()
    .map((x) => x.pages())
    .flat();

  const guids = await Promise.all(
    pages.map(async (testPage) => {
      try {
        return await testPage.evaluate('window.playwright_guid');
      } catch {
        return undefined;
      }
    })
  );
  await window.webContents.executeJavaScript('delete window.playwright_guid');

  const index = guids.findIndex((testGuid) => testGuid === guid);
  const page = pages[index];
  if (!page) {
    throw new Error('Unable to find playwright Page from BrowserWindow. Please report this.');
  }
  return page;
};

export default {
  connect,
  getPage,
  initialize,
};
