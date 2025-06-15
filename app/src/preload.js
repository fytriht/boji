const { ipcRenderer } = require("electron");

window.chrome = {
  cookies: {
    getAll: (options, callback) => {
      ipcRenderer.invoke("get-all-cookies", options).then(callback);
    },
  },
  // chrome.storage.sync API mock using localStorage
  storage: {
    sync: {
      /**
       * Gets items from storage
       * @param {Array} keys - Keys to retrieve
       * @param {function} callback - Callback function to handle the results
       */
      get: (keys, callback) => {
        try {
          const result = {};
          for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value !== null) {
              result[key] = JSON.parse(value);
            }
          }
          setTimeout(() => callback(result), 0); // Async callback
        } catch (error) {
          console.error("Error getting storage data:", error);
          setTimeout(() => callback({}), 0);
        }
      },
      /**
       * Sets multiple items in storage
       * @param {Object} items - Object with key-value pairs to store
       * @param {function} callback - Optional callback function
       */
      set: (items, callback) => {
        try {
          for (const [key, value] of Object.entries(items)) {
            localStorage.setItem(key, JSON.stringify(value));
          }
          if (callback) setTimeout(callback, 0); // Async callback
        } catch (error) {
          console.error("Error setting storage data:", error);
          if (callback) setTimeout(callback, 0);
        }
      },
    },
    session: {
      get: (keys, callback) => {
        console.log("Chrome storage session get called with keys:", keys);
        // Session storage is temporary, so we'll use sessionStorage
        const result = {};
        if (typeof keys === "string") {
          keys = [keys];
        }
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            const value = sessionStorage.getItem(key);
            if (value !== null) {
              try {
                result[key] = JSON.parse(value);
              } catch (e) {
                result[key] = value;
              }
            }
          });
        } else if (typeof keys === "object" && keys !== null) {
          // keys is an object with default values
          Object.keys(keys).forEach((key) => {
            const value = sessionStorage.getItem(key);
            if (value !== null) {
              try {
                result[key] = JSON.parse(value);
              } catch (e) {
                result[key] = value;
              }
            } else {
              result[key] = keys[key]; // use default value
            }
          });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      },
      set: (items, callback) => {
        console.log("Chrome storage session set called with items:", items);
        Object.keys(items).forEach((key) => {
          sessionStorage.setItem(key, JSON.stringify(items[key]));
        });
        if (callback) callback();
        return Promise.resolve();
      },
      remove: (keys, callback) => {
        console.log("Chrome storage session remove called with keys:", keys);
        if (typeof keys === "string") {
          keys = [keys];
        }
        keys.forEach((key) => {
          sessionStorage.removeItem(key);
        });
        if (callback) callback();
        return Promise.resolve();
      },
      clear: (callback) => {
        console.log("Chrome storage session clear called");
        sessionStorage.clear();
        if (callback) callback();
        return Promise.resolve();
      },
    },
  },
  // chrome.runtime API mock
  runtime: {
    /**
     * Gets the URL for a resource inside the extension
     * @param {string} path - Path to the resource
     * @returns {string} Full URL to the resource
     */
    getURL: (path) => {
      // In Electron, we need to construct the URL based on the app's location
      // Assuming the tofu folder is accessible from the app
      // const baseUrl = window.location.origin;
      return path;
    },

    /**
     * Connects to a native application or another part of the extension
     * @param {Object} connectInfo - Connection information
     * @returns {Object} Mock port object
     */
    connect: (connectInfo) => {
      console.log("Runtime connect called with:", connectInfo);
      // Return a mock port object
      const mockPort = {
        name: connectInfo?.name || "default",
        onMessage: {
          addListener: (callback) => {
            console.log("Port onMessage listener added");
            // Store the callback for potential future use
            mockPort._messageCallback = callback;
          },
        },
        onDisconnect: {
          addListener: (callback) => {
            console.log("Port onDisconnect listener added");
            mockPort._disconnectCallback = callback;
          },
        },
        postMessage: (message) => {
          console.log("Port postMessage called with:", message);
          // In a real implementation, this would send the message
          // For now, we'll just log it
        },
        disconnect: () => {
          console.log("Port disconnect called");
          if (mockPort._disconnectCallback) {
            mockPort._disconnectCallback(mockPort);
          }
        },
      };
      return mockPort;
    },

    /**
     * Event fired when the extension is first installed
     */
    onInstalled: {
      addListener: (callback) => {
        console.log("Runtime onInstalled listener added");
        // Simulate the installed event
        setTimeout(() => {
          callback({ reason: "install" });
        }, 100);
      },
    },

    /**
     * Event fired when the extension is about to be suspended
     */
    onSuspend: {
      addListener: (callback) => {
        console.log("Runtime onSuspend listener added");
        // In Electron, we can listen to app events
        window.addEventListener("beforeunload", callback);
      },
    },

    /**
     * Event fired when a connection is made from content script or another extension
     */
    onConnect: {
      addListener: (callback) => {
        console.log("Runtime onConnect listener added");
        // Store the callback for potential future use
        window._runtimeConnectCallback = callback;
      },
    },

    /**
     * Sends a message to the extension
     * @param {any} message - Message to send
     * @param {Function} responseCallback - Optional callback for response
     */
    sendMessage: (message, responseCallback) => {
      console.log("Runtime sendMessage called with:", message);
      // In Electron, we can simulate this by handling it locally
      // For now, just call the callback if provided
      if (responseCallback) {
        setTimeout(() => responseCallback({ success: true }), 10);
      }
    },
  },

  // chrome.declarativeNetRequest API mock (simplified)
  declarativeNetRequest: {
    /**
     * Updates dynamic rules
     * @param {Object} options - Rule update options
     * @returns {Promise} Promise that resolves when rules are updated
     */
    updateDynamicRules: (options) => {
      console.log(
        "DeclarativeNetRequest updateDynamicRules called with:",
        options
      );
      // In Electron, you might want to handle this through the main process
      // For now, we'll just resolve the promise
      return Promise.resolve();
    },
  },
};

console.log("Chrome object has been overridden:", window.chrome);
