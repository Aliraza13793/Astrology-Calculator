/* City search against the Open-Meteo geocoding API.
   Open-Meteo is used because it needs no key, sets CORS headers, and returns
   an IANA timezone name alongside the coordinates, which is exactly what the
   historical offset resolution in core/time.js needs. */
(function (root) {
  'use strict';

  var config = root.SMRC.config.geocode;

  /**
   * Turn one API result into the shape the calculator uses.
   * @param {object} raw
   * @returns {object|null} null when the record is unusable
   */
  function normalise(raw) {
    if (!raw) return null;
    var lat = Number(raw.latitude);
    var lon = Number(raw.longitude);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    var parts = [raw.name];
    if (raw.admin1) parts.push(raw.admin1);
    if (raw.country) parts.push(raw.country);
    return {
      id: [raw.name, raw.admin1, raw.country, lat, lon].join('|'),
      name: raw.name,
      admin1: raw.admin1 || '',
      country: raw.country || '',
      label: parts.join(', '),
      latitude: lat,
      longitude: lon,
      timezone: raw.timezone,
      population: Number(raw.population) || 0
    };
  }

  /**
   * Drop duplicate coordinates and rank by population so the obvious answer is
   * first for a query like "Springfield".
   * @param {object[]} list
   * @param {number} [limit]
   * @returns {object[]}
   */
  function rank(list, limit) {
    var seen = {};
    var unique = [];
    for (var i = 0; i < list.length; i++) {
      var place = list[i];
      if (!place) continue;
      var key = place.latitude.toFixed(3) + ',' + place.longitude.toFixed(3);
      if (seen[key]) continue;
      seen[key] = true;
      unique.push(place);
    }
    unique.sort(function (a, b) {
      return b.population - a.population;
    });
    return typeof limit === 'number' ? unique.slice(0, limit) : unique;
  }

  /**
   * Build a search client. Dependencies are injected so this is testable
   * without a network.
   *
   * @param {{fetch?: function, storage?: object, endpoint?: string,
   *   minChars?: number, maxResults?: number, cacheKey?: string,
   *   cacheTtlMs?: number, timeoutMs?: number}} [deps]
   */
  function createClient(deps) {
    var options = deps || {};
    var doFetch = options.fetch
      || (typeof fetch !== 'undefined' ? function (u, o) { return fetch(u, o); } : null);
    /* An explicit null means no cache at all, which is not the same as leaving
       the key out, so presence is checked rather than truthiness. */
    var storage = 'storage' in options
      ? options.storage
      : (root.SMRC.storage && root.SMRC.storage.available() ? root.SMRC.storage : null);
    var endpoint = options.endpoint || config.endpoint;
    var minChars = options.minChars || config.minChars;
    var maxResults = options.maxResults || config.maxResults;
    var cacheKey = options.cacheKey || config.cacheKey;
    var cacheTtlMs = options.cacheTtlMs || config.cacheTtlMs;
    var timeoutMs = options.timeoutMs || config.timeoutMs;

    var memory = {};

    function readCache(query) {
      var now = Date.now();
      if (memory[query]) return memory[query];
      var stored = storage && storage.get(cacheKey, null);
      if (stored && stored[query] && now - stored[query].at < cacheTtlMs) {
        memory[query] = stored[query];
        return stored[query];
      }
      return null;
    }

    function writeCache(query, results) {
      var entry = { at: Date.now(), results: results };
      memory[query] = entry;
      if (!storage) return;
      var stored = storage.get(cacheKey, {}) || {};
      stored[query] = entry;
      storage.set(cacheKey, stored);
    }

    /**
     * Search for a place.
     *
     * The result distinguishes "no such city" from "the search did not work",
     * because the two need different messages: one asks the reader to respell,
     * the other to check their connection. Returning a bare array would make
     * those two cases indistinguishable.
     *
     * @param {string} query
     * @returns {Promise<{results: object[], failed: boolean, query: string}>}
     */
    function search(query) {
      var text = String(query || '').trim();
      if (text.length < minChars) {
        return Promise.resolve({ results: [], failed: false, query: text });
      }

      var cached = readCache(text.toLowerCase());
      if (cached) return Promise.resolve({ results: cached.results, failed: false, query: text });

      if (!doFetch) return Promise.resolve({ results: [], failed: true, query: text });

      var url = endpoint
        + '?name=' + encodeURIComponent(text)
        + '&count=' + Math.max(maxResults * 3, 10)
        + '&language=en'
        + '&format=json';

      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = controller
        ? setTimeout(function () { controller.abort(); }, timeoutMs)
        : null;

      return doFetch(url, controller ? { signal: controller.signal } : undefined)
        .then(function (response) {
          if (timer) clearTimeout(timer);
          if (!response || !response.ok) {
            return { results: [], failed: true, query: text };
          }
          return response.json().then(function (payload) {
            var list = (payload && payload.results) || [];
            var results = rank(list.map(normalise).filter(Boolean), maxResults);
            writeCache(text.toLowerCase(), results);
            return { results: results, failed: false, query: text };
          }, function () {
            return { results: [], failed: true, query: text };
          });
        })
        .catch(function () {
          if (timer) clearTimeout(timer);
          return { results: [], failed: true, query: text };
        });
    }

    /**
     * Describe a place the way it appears next to the form.
     * @param {object} place
     * @returns {string}
     */
    function label(place) {
      return place.label;
    }

    return {
      search: search,
      label: label,
      rank: rank,
      normalise: normalise,
      clearCache: function () {
        memory = {};
        if (storage) storage.remove(cacheKey);
      }
    };
  }

  root.SMRC = root.SMRC || {};
  root.SMRC.geocode = {
    createClient: createClient,
    normalise: normalise,
    rank: rank
  };
})(typeof window !== 'undefined' ? window : globalThis);
