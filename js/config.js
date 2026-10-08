/* Tunable constants. Everything a human may want to change lives here. */
(function (root) {
  'use strict';

  root.SMRC = root.SMRC || {};

  root.SMRC.config = {
    /* Geocoding. Open-Meteo's public endpoint, no key, CORS-enabled. */
    geocode: {
      endpoint: 'https://geocoding-api.open-meteo.com/v1/search',
      minChars: 2,
      maxResults: 6,
      cacheKey: 'smrc.geocode.v1',
      cacheTtlMs: 1000 * 60 * 60 * 24 * 30,
      debounceMs: 250,
      timeoutMs: 8000
    },

    /* Accepted birth date range. Outside this the ELP-2000 truncation in
       ch. 47 degrades and the IANA database is thin on pre-1900 offsets. */
    yearRange: { min: 1800, max: 2200 },

    /* Aspect orbs in degrees, applied to the separation between the three
       Big Three longitudes. */
    orbs: {
      conjunction: 8,
      opposition: 8,
      square: 7,
      trine: 7,
      sextile: 4,
      quincunx: 3
    },

    /* Widest separation before an angular distance is called "unrelated".
       Beyond 135 degrees the pair has no meaningful interaction at all. */
    maxRelevantSeparation: 135,

    storage: {
      savedKey: 'smrc.saved.v1'
    },

    /* Shown next to the results. These numbers are what the test suite can
       actually demonstrate, and the copy on the page is derived from them. */
    accuracy: {
      sunArcsec: 36,
      moonArcsec: 30,
      ascendantArcsec: 2,
      note: 'The Sun comes from the standard mean-longitude series of Meeus '
        + 'chapter 25, the Moon from a truncation of ELP-2000/82, and the '
        + 'Ascendant from the horizon at your coordinates. Expect about half '
        + 'an arcminute for the Moon, the same for the Sun and a couple of '
        + 'arcseconds for the Ascendant. A sign is only genuinely in doubt if '
        + 'a body sits within a fraction of a degree of a sign boundary, and '
        + 'this page says so when that happens. The Rising sign additionally '
        + 'depends on your birth time being right to the minute.'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
