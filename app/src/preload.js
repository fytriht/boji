const { ipcRenderer } = require("electron");

window.chrome = {
  cookies: {
    getAll: (options, callback) => {
      ipcRenderer.invoke("get-all-cookies", options).then(callback);
    },
  },

  // just mock the implementation that needed
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
};
