/* localStorage wrapper. Every operation fails soft: a private-mode browser
   with storage disabled must not break the calculator. */
(function (root) {
  'use strict';

  /**
   * @param {object} [backend] anything with getItem/setItem/removeItem
   * @returns {{get: function, set: function, remove: function, clearAll: function,
   *   available: function}}
   */
  function createStorage(backend) {
    var store = backend !== undefined
      ? backend
      : (typeof localStorage !== 'undefined' ? localStorage : null);

    function available() {
      return !!store;
    }

    function get(key, fallback) {
      if (!store) return fallback;
      try {
        var raw = store.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    }

    function set(key, value) {
      if (!store) return false;
      try {
        store.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        /* Quota exceeded or storage disabled. Non fatal by design. */
        return false;
      }
    }

    function remove(key) {
      if (!store) return false;
      try {
        store.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }

    function clearAll() {
      if (!store) return false;
      try {
        store.clear();
        return true;
      } catch (e) {
        return false;
      }
    }

    return {
      get: get,
      set: set,
      remove: remove,
      clearAll: clearAll,
      available: available
    };
  }

  root.SMRC = root.SMRC || {};
  root.SMRC.storage = createStorage();
  root.SMRC.createStorage = createStorage;
})(typeof window !== 'undefined' ? window : globalThis);
