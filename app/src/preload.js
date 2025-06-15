const { ipcRenderer } = require("electron");

window.chrome = {
  cookies: {
    getAll: (options, callback) => {
      ipcRenderer.invoke("get-all-cookies", options).then(callback);
    },
  },
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
      get: async (key) => {
        const value = sessionStorage.getItem(key);
        return { [key]: value !== null ? JSON.parse(value) : null };
      },
      set: async (items) => {
        for (const [key, value] of Object.entries(items)) {
          sessionStorage.setItem(key, JSON.stringify(value));
        }
      },
    },
  },

  runtime: {
    getURL: (path) => path,

    onConnect: {
      // In electron context, the onConnect related tofu code is not used
      // so we just need to make sure it will not throw error
      addListener: () => {},
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
