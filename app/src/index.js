const { app, BrowserWindow, ipcMain, session, Menu } = require("electron");
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

  ipcMain.handle("get-all-cookies", (_, options) => {
    return session.defaultSession.cookies.get(options || {});
  });

  // Modify request headers for douban.com requests (equivalent to chrome.declarativeNetRequest in `background.js`)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ["*://*.douban.com/*"],
    },
    async (details, callback) => {
      if (details.resourceType === "xhr") {
        details.requestHeaders["Referer"] = "https://m.douban.com/";
      }

      // Auto-add cookies for douban.com requests
      const cookies = await session.defaultSession.cookies.get({
        url: details.url,
      });
      if (cookies.length > 0) {
        details.requestHeaders["Cookie"] = cookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; ");
      }

      callback({ requestHeaders: details.requestHeaders });
    }
  );

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

const createMenu = () => {
  const clearCache = {
    label: "Clear Cache",
    click: async () => {
      try {
        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData({
          storages: [
            "appcache",
            "cookies",
            "filesystem",
            "indexdb",
            "localstorage",
            "shadercache",
            "websql",
            "serviceworkers",
            "cachestorage",
          ],
        });

        const { dialog } = require("electron");
        dialog.showMessageBox({
          type: "info",
          title: "Cache Cleared",
          message: "All cache data has been cleared successfully.",
          buttons: ["OK"],
        });
      } catch (error) {
        const { dialog } = require("electron");
        dialog.showErrorBox("Error", "Failed to clear cache: " + error.message);
      }
    },
  };

  const template = [];
  // macOS specific menu adjustments
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        clearCache,
        { type: "separator" },
        { role: "quit" },
      ],
    });
  } else {
    template.push({
      label: "File",
      submenu: [clearCache],
    });
  }
  template.push({
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  });
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

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
  createMenu(); // Add this line to create the menu

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
