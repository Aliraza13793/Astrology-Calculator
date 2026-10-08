/* The reveal step between the form and the results.
   Falls back to an instant reveal when animation is not wanted. */
(function (root) {
  'use strict';

  var STEP_MS = 1500;

  function wantsMotion() {
    if (typeof window.matchMedia !== 'function') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Show the reveal card, then hand over to the caller.
   *
   * @param {function} done called once the card has been shown
   * @param {{motion?: boolean, stepMs?: number}} [options]
   */
  function play(done, options) {
    var opts = options || {};
    var section = document.getElementById('reveal');
    var card = section.querySelector('.reveal-card');
    var caption = section.querySelector('.reveal-caption');
    var motion = opts.motion === undefined ? wantsMotion() : opts.motion;
    var step = opts.stepMs || STEP_MS;

    section.hidden = false;
    card.hidden = false;
    card.setAttribute('aria-hidden', 'true');
    if (motion) {
      section.classList.remove('skip');
      caption.textContent = 'Working out your chart\u2026';
    } else {
      section.classList.add('skip');
      caption.textContent = 'Here is your chart.';
      done();
      return;
    }

    window.setTimeout(function () {
      section.hidden = true;
      done();
    }, step);
  }

  /**
   * Move keyboard focus to a results region and announce it.
   * @param {HTMLElement} target
   */
  function announce(target) {
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  root.SMRC = root.SMRC || {};
  root.SMRC.ui = root.SMRC.ui || {};
  root.SMRC.ui.reveal = {
    play: play,
    announce: announce,
    wantsMotion: wantsMotion
  };
})(typeof window !== 'undefined' ? window : globalThis);
