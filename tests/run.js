/* Test entry point. `node tests/run.js`
   Loads the browser sources as plain scripts (they attach to globalThis), then
   the test files, then runs everything. */
'use strict';

const path = require('path');

const SOURCES = [
  '../js/core/math.js',
  '../js/config.js',
  '../js/core/time.js',
  '../js/data/signs.js',
  '../js/data/aspects.js',
  '../js/data/interpretations.js',
  '../js/core/ephemeris.js',
  '../js/core/vsop87d.js',
  '../js/core/planets.js',
  '../js/core/houses.js',
  '../js/core/zodiac.js',
  '../js/core/chart.js',
  '../js/core/reading.js',
  '../js/core/synastry.js',
  '../js/core/events.js',
  '../js/ui/dom.js',
  '../js/data/synastry.js',
  '../js/services/storage.js',
  '../js/services/geocode.js'
];

const SUITES = [
  './math.test.js',
  './time.test.js',
  './ephemeris.test.js',
  './planets.test.js',
  './houses.test.js',
  './zodiac.test.js',
  './chart.test.js',
  './reading.test.js',
  './synastry.test.js',
  './events.test.js',
  './geocode.test.js',
  './integration.test.js',
  './pages.test.js',
  './ui.test.js'
];

/* Minimal runner globals. */
(function (root) {
  const suites = [];
  let current = null;

  root.describe = function (name, fn) {
    current = { name: name, tests: [] };
    suites.push(current);
    fn();
    current = null;
  };

  root.it = function (name, fn) {
    if (!current) throw new Error('it() outside describe()');
    current.tests.push({ name: name, fn: fn });
  };

  root.runTests = async function () {
    let passed = 0;
    const failures = [];

    for (const suite of suites) {
      process.stdout.write('\n' + suite.name + '\n');
      for (const test of suite.tests) {
        try {
          /* Tests may be synchronous or return a promise. */
          await test.fn();
          passed++;
          process.stdout.write('  ok   ' + test.name + '\n');
        } catch (e) {
          failures.push({ suite: suite.name, test: test.name, error: e });
          process.stdout.write('  FAIL ' + test.name + '\n');
        }
      }
    }

    process.stdout.write('\n' + passed + ' passing, ' + failures.length + ' failing\n');
    for (const f of failures) {
      process.stdout.write('\n' + f.suite + ' > ' + f.test + '\n');
      process.stdout.write(String(f.error && f.error.message) + '\n');
    }
    process.exitCode = failures.length > 0 ? 1 : 0;
  };
})(globalThis);

for (const rel of SOURCES.concat(SUITES)) {
  require(path.join(__dirname, rel));
}

/* Unhandled rejections are failures, not noise. */
process.on('unhandledRejection', (reason) => {
  process.stdout.write('\nunhandled rejection: ' + String(reason && reason.message) + '\n');
  process.exitCode = 1;
});

globalThis.runTests();
