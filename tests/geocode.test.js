'use strict';

const assert = require('assert');
const G = globalThis.SMRC.geocode;
const S = globalThis.SMRC.createStorage;

function fakeStorage() {
  const data = {};
  return {
    data: data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    clear: () => { for (const k of Object.keys(data)) delete data[k]; }
  };
}

const RESPONSE = {
  results: [
    { name: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', country: 'United Kingdom', population: 7556900 },
    { name: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', country: 'Canada', population: 4000 },
    { name: 'London', latitude: 42.9834, longitude: -81.233, admin1: 'Ontario', timezone: 'America/Toronto', country: 'Canada', population: 400000 },
    { name: 'Londonderry', latitude: 54.9958, longitude: -7.3074, timezone: 'Europe/London', country: 'United Kingdom', population: 84000 }
  ]
};

function okFetch(payload) {
  return () => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
}

describe('geocode.normalise', () => {
  it('builds a readable label from the parts the API returns', () => {
    const place = G.normalise(RESPONSE.results[2]);
    assert.strictEqual(place.name, 'London');
    assert.strictEqual(place.label, 'London, Ontario, Canada');
    assert.strictEqual(place.timezone, 'America/Toronto');
    assert.strictEqual(place.latitude, 42.9834);
  });

  it('rejects records without usable coordinates', () => {
    assert.strictEqual(G.normalise(null), null);
    assert.strictEqual(G.normalise({ name: 'Nowhere' }), null);
    assert.strictEqual(G.normalise({ name: 'Bad', latitude: 'x', longitude: 1 }), null);
  });
});

describe('geocode.rank', () => {
  it('drops duplicate coordinates and sorts by population', () => {
    const ranked = G.rank(RESPONSE.results.map(G.normalise));
    assert.strictEqual(ranked[0].name, 'London');
    assert.strictEqual(ranked[0].country, 'United Kingdom');
    assert.strictEqual(ranked.length, 3);
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i - 1].population >= ranked[i].population);
    }
  });

  it('respects the requested limit', () => {
    const ranked = G.rank(RESPONSE.results.map(G.normalise), 2);
    assert.strictEqual(ranked.length, 2);
  });
});

describe('geocode.client', () => {
  it('returns results for a query long enough to search', async () => {
    const client = G.createClient({ fetch: okFetch(RESPONSE), storage: null });
    const answer = await client.search('London');
    assert.strictEqual(answer.failed, false);
    const results = answer.results;
    assert.strictEqual(results.length, 3);
    assert.strictEqual(results[0].label, 'London, United Kingdom');
  });

  it('does not call the API for a one character query', async () => {
    let called = 0;
    const client = G.createClient({
      fetch: () => { called++; return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSE) }); },
      storage: null
    });
    const short = await client.search('L');
    assert.deepStrictEqual(short.results, []);
    assert.strictEqual(short.failed, false);
    assert.strictEqual(called, 0);
  });

  it('caches by query so a repeat costs nothing', async () => {
    let called = 0;
    const client = G.createClient({
      fetch: () => { called++; return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSE) }); },
      storage: null
    });
    await client.search('London');
    await client.search('london');
    assert.strictEqual(called, 1);
  });

  it('reads the cache back out of storage', async () => {
    const store = S(fakeStorage());
    let called = 0;
    const fetchImpl = () => { called++; return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSE) }); };
    await G.createClient({ fetch: fetchImpl, storage: store }).search('London');
    const second = G.createClient({ fetch: fetchImpl, storage: store });
    const results = (await second.search('London')).results;
    assert.strictEqual(called, 1);
    assert.strictEqual(results.length, 3);
  });

  it('does not use the global storage when none is supplied', async () => {
    /* A client with storage: null must not read or write the shared cache, or
       one test's result leaks into the next. */
    const shared = S(fakeStorage());
    let called = 0;
    const counting = () => {
      called++;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSE) });
    };
    const first = G.createClient({ fetch: counting, storage: null });
    await first.search('Oslo');
    await G.createClient({ fetch: counting, storage: null }).search('Oslo');
    assert.strictEqual(called, 2, 'the second client must not have hit a shared cache');
    assert.strictEqual(shared.get('smrc.geocode.v1', null), null);
  });

  it('survives a network failure and an HTTP error', async () => {
    const failing = G.createClient({
      fetch: () => Promise.reject(new Error('offline')),
      storage: null
    });
    const offline = await failing.search('London');
    assert.deepStrictEqual(offline.results, []);
    assert.strictEqual(offline.failed, true, 'a network failure is not an empty result');

    const badStatus = G.createClient({
      fetch: () => Promise.resolve({ ok: false, status: 429 }),
      storage: null
    });
    const errored = await badStatus.search('London');
    assert.strictEqual(errored.failed, true);
    assert.deepStrictEqual(errored.results, []);

    const noResults = G.createClient({
      fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
      storage: null
    });
    const empty = await noResults.search('London');
    assert.strictEqual(empty.failed, false, 'no match is not a failure');
    assert.deepStrictEqual(empty.results, []);
  });

  it('sends the query and the count in the URL', async () => {
    let seen = '';
    const client = G.createClient({
      fetch: (url) => { seen = url; return Promise.resolve({ ok: true, json: () => Promise.resolve(RESPONSE) }); },
      storage: null,
      endpoint: 'https://example.test/search'
    });
    await client.search('Sao Paulo');
    assert.ok(seen.indexOf('https://example.test/search?') === 0, seen);
    assert.ok(seen.indexOf('name=Sao%20Paulo') !== -1, seen);
    assert.ok(seen.indexOf('count=') !== -1, seen);
  });

  it('does not blow up when storage is unavailable', async () => {
    const blocked = S({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => {} });
    assert.strictEqual(blocked.available(), true);
    assert.deepStrictEqual(blocked.get('missing', 'fallback'), 'fallback');
    assert.strictEqual(blocked.set('k', { a: 1 }), false);
    const client = G.createClient({ fetch: okFetch(RESPONSE), storage: blocked });
    assert.strictEqual((await client.search('London')).results.length, 3);
  });
});
