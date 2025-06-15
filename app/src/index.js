const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");

// Handle creating/removing shortcuts on Windows. (on Windows 10 to disable the shortcut creation, go to Settings > Privacy > General > let apps use advertising ID...)
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: false,
      nodeIntegration: true,
      webSecurity: false, // Allow loading local files
    },
  });

  ipcMain.on("test1", (event) => {
    // const webContents = event.sender
    // const win = BrowserWindow.fromWebContents(webContents)
    // win.setTitle(title)
    session.defaultSession.cookies
      .get({
        url: "https://www.douban.com",
      })
      .then((cookies) => {
        console.log("@@", cookies);
      });
  });

  // Handle get-all-cookies IPC call from preload script
  ipcMain.handle("get-all-cookies", async (event, options) => {
    try {
      const cookies = await session.defaultSession.cookies.get(options || {});
      console.log("Retrieved cookies:", cookies);
      return cookies;
    } catch (error) {
      console.error("Error getting cookies:", error);
      throw error;
    }
  });

  // Modify request headers for douban.com requests (equivalent to chrome.declarativeNetRequest)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["*://*.douban.com/*"],
    },
    async (details, callback) => {
      // Check if this is an XMLHttpRequest
      if (details.resourceType === "xhr") {
        // Set Referer header
        details.requestHeaders["Referer"] = "https://m.douban.com/";
        console.log("修改请求头规则已应用到:", details.url);
      }

      // Auto-add cookies for douban.com requests
      try {
        const cookies = await session.defaultSession.cookies.get({
          url: details.url,
        });

        if (cookies.length > 0) {
          const cookieString = cookies
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ");
          details.requestHeaders["Cookie"] = cookieString;
          console.log(
            "自动添加cookies到请求:",
            details.url,
            "cookies:",
            cookieString
          );
        }
      } catch (error) {
        console.error("获取cookies失败:", error);
      }

      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // chrome.storage.sync is now handled directly in preload using localStorage

  // and load the test page first to verify Chrome API mocking
  // mainWindow.loadFile(path.join(__dirname, '../test.html'));
  // mainWindow.loadFile(path.join(__dirname, '../../tofu/options.html'));
  mainWindow.loadFile(path.join(__dirname, "../../tofu/backup.html"));

  // Handle external links - open in default browser instead of Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });

  // Also handle navigation to external URLs
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // If it's an external URL (not file:// protocol), open in default browser
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      event.preventDefault();
      require("electron").shell.openExternal(navigationUrl);
    }
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Configure session to handle cookies properly
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Modify Set-Cookie headers to remove SameSite and Secure restrictions
    if (details.responseHeaders && details.responseHeaders["set-cookie"]) {
      details.responseHeaders["set-cookie"] = details.responseHeaders[
        "set-cookie"
      ].map((cookie) => {
        // For douban.com cookies, set SameSite=None and Secure for cross-site compatibility
        if (details.url.includes("douban.com")) {
          // Remove existing SameSite and Secure attributes
          let modifiedCookie = cookie
            .replace(/;\s*samesite=[^;]*/gi, "")
            .replace(/;\s*secure/gi, "");
          // Add SameSite=None and Secure (required together)
          modifiedCookie += "; SameSite=None; Secure";
          return modifiedCookie;
        }
        return cookie;
      });
    }
    callback({ responseHeaders: details.responseHeaders });
  });

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
