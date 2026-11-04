/**
 * Number formatting for the page. Pure functions.
 * Rates: 2 decimals with % ("12.84%"). Spreads: signed points ("+1.50 pts").
 * Amounts (input in LKR m): "LKR 9.5m", "LKR 128.4m", "LKR 1.0bn".
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OBFormat = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Rounds half away from zero after removing binary floating-point noise,
   * so that 11.965 shows as 11.97 rather than 11.96.
   * @param {number} x
   * @param {number} dp Decimal places.
   * @returns {number}
   */
  function round(x, dp) {
    const clean = Number(x.toPrecision(12));
    const f = Math.pow(10, dp);
    return (Math.sign(clean) * Math.round(Math.abs(clean) * f)) / f;
  }

  /** @param {number} dec Decimal rate. @returns {string} e.g. "12.84%" */
  function rate(dec, dp = 2) {
    return round(dec * 100, dp).toFixed(dp) + '%';
  }

  /** @param {number} dec Decimal spread. @returns {string} e.g. "+1.50 pts" */
  function pts(dec, dp = 2) {
    const v = round(dec * 100, dp);
    const s = v > 0 ? '+' : v < 0 ? '−' : '';
    return s + Math.abs(v).toFixed(dp) + ' pts';
  }

  /** Spread without the unit, signed: "+1.50" */
  function ptsShort(dec, dp = 2) {
    return pts(dec, dp).replace(' pts', '');
  }

  /**
   * @param {number} m Amount in LKR millions.
   * @returns {string} "LKR 9.5m" or "LKR 1.0bn" (bn from 1,000m).
   */
  function lkr(m) {
    const neg = m < 0;
    const a = Math.abs(m);
    let out;
    if (round(a, 1) >= 1000) out = 'LKR ' + round(a / 1000, 2).toFixed(a % 100 === 0 ? 1 : 2).replace(/(\.\d)0$/, '$1') + 'bn';
    else out = 'LKR ' + round(a, 1).toFixed(1) + 'm';
    return (neg ? '−' : '') + out;
  }

  /** @param {number} share 0–1 @returns {string} "50%" */
  function share(s) {
    return round(s * 100, 0).toFixed(0) + '%';
  }

  /** ISO date "2025-02-17" → "17 Feb 2025"; other strings pass through. */
  function date(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1];
    return Number(m[3]) + ' ' + mon + ' ' + m[1];
  }

  return { round, rate, pts, ptsShort, lkr, share, date };
});
