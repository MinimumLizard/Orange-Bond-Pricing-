/**
 * Orange Bond pricing: an illustrative model. Pure functions only.
 *
 * Conventions
 * - All rates and spreads inside this module are DECIMALS (0.1075 = 10.75%;
 *   a spread of 0.0060 = 0.60 percentage points). data/inputs.json stores
 *   percentages, and {@link deriveBase} converts them.
 * - Sri Lankan Treasury bond yields are quoted on a semi-annual basis, so
 *   every coupon is put on that basis before it is compared with a yield.
 * - Money amounts are in LKR millions.
 *
 * The file is a plain script so that index.html works when opened straight
 * from disk (file://). It exposes `window.OBModel` in the browser and
 * `module.exports` in Node (tests).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OBModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- conversions

  /**
   * Converts a semi-annual-basis rate to its annual-pay equivalent.
   * semiToAnnual(r) = (1 + r/2)^2 − 1
   * @param {number} r Rate, semi-annual basis (decimal).
   * @returns {number} Annual-pay equivalent (decimal).
   */
  function semiToAnnual(r) {
    return Math.pow(1 + r / 2, 2) - 1;
  }

  /**
   * Converts an annual-pay rate to its semi-annual-basis equivalent.
   * annualToSemi(r) = 2 × (√(1 + r) − 1)
   * @param {number} r Rate paid annually (decimal).
   * @returns {number} Semi-annual-basis equivalent (decimal).
   */
  function annualToSemi(r) {
    return 2 * (Math.sqrt(1 + r) - 1);
  }

  /**
   * Puts a coupon on the semi-annual basis, given how often it is paid.
   * @param {number} coupon Coupon rate (decimal).
   * @param {'semi'|'annual'} frequency Payment frequency.
   * @returns {number} Coupon on the semi-annual basis (decimal).
   */
  function toSemiBasis(coupon, frequency) {
    if (frequency === 'semi') return coupon;
    if (frequency === 'annual') return annualToSemi(coupon);
    throw new Error('Unknown frequency: ' + frequency);
  }

  // -------------------------------------------------------------- spreads

  /**
   * Historical spread = coupon (semi-annual basis) − tenor-matched government
   * yield at pricing.
   * @param {number} couponSemi Coupon, semi-annual basis (decimal).
   * @param {number} govYield Government yield, semi-annual basis (decimal).
   * @returns {number} Spread (decimal).
   */
  function spread(couponSemi, govYield) {
    return couponSemi - govYield;
  }

  /**
   * Guarantee effect = unsecured spread − guaranteed spread. This is an
   * estimate from two issues priced on different dates, at different tenors
   * and in different market conditions.
   * @param {number} unsecuredSpread Decimal.
   * @param {number} guaranteedSpread Decimal.
   * @returns {number} Decimal.
   */
  function guaranteeEffect(unsecuredSpread, guaranteedSpread) {
    return unsecuredSpread - guaranteedSpread;
  }

  /**
   * Arithmetic mean.
   * @param {number[]} xs
   * @returns {number}
   */
  function mean(xs) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  // -------------------------------------------------------------- coupons

  /**
   * Orange coupon with no credit enhancement (semi-annual basis):
   * govNow + unsecuredSpread + tenorAdj.
   * @param {number} govNow Decimal.
   * @param {number} unsecuredSpread Decimal.
   * @param {number} [tenorAdj=0] Tenor adjustment to the unsecured spread (decimal).
   * @returns {number} Decimal.
   */
  function couponNoEnhancement(govNow, unsecuredSpread, tenorAdj = 0) {
    return govNow + unsecuredSpread + tenorAdj;
  }

  /**
   * Orange coupon with a full bank guarantee (semi-annual basis):
   * govNow + guaranteedSpread. The guaranteed spread comes from the 3-year
   * Green Bond, so it gets no tenor adjustment.
   * @param {number} govNow Decimal.
   * @param {number} guaranteedSpread Decimal.
   * @returns {number} Decimal.
   */
  function couponFullGuarantee(govNow, guaranteedSpread) {
    return govNow + guaranteedSpread;
  }

  /**
   * Orange coupon with a partial DFI guarantee (semi-annual basis):
   * govNow + (unsecuredSpread + tenorAdj) − share × guaranteeEffect,
   * where guaranteeEffect = (unsecuredSpread + tenorAdj) − guaranteedSpread.
   * share = 0 gives the no-enhancement coupon; share = 1 gives the full-guarantee coupon.
   * @param {number} govNow Decimal.
   * @param {number} unsecuredSpread Decimal.
   * @param {number} guaranteedSpread Decimal.
   * @param {number} share Share of the guarantee effect delivered, 0–1.
   * @param {number} [tenorAdj=0] Decimal.
   * @returns {number} Decimal.
   */
  function couponPartialGuarantee(govNow, unsecuredSpread, guaranteedSpread, share, tenorAdj = 0) {
    const unsec = unsecuredSpread + tenorAdj;
    return govNow + unsec - share * guaranteeEffect(unsec, guaranteedSpread);
  }

  // -------------------------------------------------------------- economics

  /**
   * Annual interest = S × coupon.
   * @param {number} size Issue size, LKR m.
   * @param {number} coupon Decimal.
   * @returns {number} LKR m a year.
   */
  function annualInterest(size, coupon) {
    return size * coupon;
  }

  /**
   * Gross saving from the guarantee per year = S × (unenhanced − guaranteed coupon).
   * @param {number} size LKR m.
   * @param {number} unenhancedCoupon Decimal.
   * @param {number} guaranteedCoupon Decimal.
   * @returns {number} LKR m a year.
   */
  function grossSavingPerYear(size, unenhancedCoupon, guaranteedCoupon) {
    return size * (unenhancedCoupon - guaranteedCoupon);
  }

  /**
   * Covered amount = S × coverage factor (e.g. 1.10 = principal plus about one year's interest).
   * @param {number} size LKR m.
   * @param {number} coverageFactor Multiple of issue size.
   * @returns {number} LKR m.
   */
  function coveredAmount(size, coverageFactor) {
    return size * coverageFactor;
  }

  /**
   * Breakeven guarantee fee = gross saving per year ÷ covered amount.
   * @param {number} grossPerYear LKR m a year.
   * @param {number} covered LKR m.
   * @returns {number} Fee rate a year on the covered amount (decimal).
   */
  function breakevenFee(grossPerYear, covered) {
    return covered > 0 ? grossPerYear / covered : NaN;
  }

  /**
   * Net saving over the tenor = (gross saving − fee × covered amount) × T.
   * Undiscounted on purpose: it is a simple sum, not a present value.
   * @param {number} grossPerYear LKR m a year.
   * @param {number} fee Fee rate a year (decimal).
   * @param {number} covered LKR m.
   * @param {number} tenorYears T.
   * @returns {number} LKR m over the tenor.
   */
  function netSaving(grossPerYear, fee, covered, tenorYears) {
    return (grossPerYear - fee * covered) * tenorYears;
  }

  /**
   * Rule of thumb: interest saved a year for a given rate saving on a given size.
   * 0.25 points on LKR 1,000m = LKR 2.5m a year.
   * @param {number} size LKR m.
   * @param {number} rateSaving Decimal.
   * @returns {number} LKR m a year.
   */
  function ruleOfThumb(size, rateSaving) {
    return size * rateSaving;
  }

  // -------------------------------------------------------------- assembly

  const pct = (x) => x / 100;

  /**
   * Builds the historical spreads and the base-case parameters from
   * data/inputs.json. This is the only place where percentages become decimals.
   * @param {object} data Parsed inputs.json.
   * @returns {{history: object, base: object}}
   */
  function deriveBase(data) {
    const v = (k) => {
      const item = data.inputs[k];
      if (!item) throw new Error('Missing input: ' + k);
      return item.value;
    };

    const greenSemi = toSemiBasis(pct(v('green_coupon')), 'semi');
    const social4Semi = toSemiBasis(pct(v('social_coupon_4y')), 'annual');
    const social5Semi = toSemiBasis(pct(v('social_coupon_5y')), 'annual');

    const govGreen = pct(v('gov_green'));
    const govS4 = pct(v('gov_social_4y'));
    const govS5 = pct(v('gov_social_5y'));

    const green = spread(greenSemi, govGreen);
    const social4 = spread(social4Semi, govS4);
    const social5 = spread(social5Semi, govS5);
    const unsecuredLow = Math.min(social4, social5);
    const unsecuredHigh = Math.max(social4, social5);
    const unsecuredAvg = mean([social4, social5]);

    const govNow = mean([pct(v('gov_now_bid')), pct(v('gov_now_offer'))]);

    return {
      history: {
        green: { couponSemi: greenSemi, couponQuoted: pct(v('green_coupon')), gov: govGreen, spread: green },
        social4: { couponSemi: social4Semi, couponQuoted: pct(v('social_coupon_4y')), gov: govS4, spread: social4 },
        social5: { couponSemi: social5Semi, couponQuoted: pct(v('social_coupon_5y')), gov: govS5, spread: social5 },
        unsecuredLow,
        unsecuredHigh,
        unsecuredAvg,
        guaranteeEffect: guaranteeEffect(unsecuredAvg, green),
        govSocialAvg: mean([govS4, govS5]),
      },
      base: {
        govNow,
        unsecuredSpread: unsecuredAvg,
        guaranteedSpread: green,
        share: v('partial_share'),
        tenorAdj: v('tenor_adjustment') / 100,
        size: v('orange_size'),
        fee: pct(v('guarantee_fee')),
        coverage: v('coverage_factor'),
        tenorYears: v('orange_tenor'),
        unsecuredHalfWidth: (unsecuredHigh - unsecuredLow) / 2,
      },
    };
  }

  /**
   * Computes every output on the page for one set of assumptions.
   * @param {object} p Parameters (decimals; size in LKR m).
   * @param {number} p.govNow
   * @param {number} p.unsecuredSpread
   * @param {number} p.guaranteedSpread
   * @param {number} p.share 0–1
   * @param {number} p.tenorAdj
   * @param {number} p.size LKR m
   * @param {number} p.fee Guarantee fee a year, decimal
   * @param {number} p.coverage Coverage factor
   * @param {number} p.tenorYears
   * @param {number} p.unsecuredHalfWidth Half the gap between the two Social spreads (for the range)
   * @returns {object}
   */
  function scenario(p) {
    const unsec = p.unsecuredSpread + p.tenorAdj;
    const ge = guaranteeEffect(unsec, p.guaranteedSpread);
    const hw = p.unsecuredHalfWidth || 0;

    const none = couponNoEnhancement(p.govNow, p.unsecuredSpread, p.tenorAdj);
    const full = couponFullGuarantee(p.govNow, p.guaranteedSpread);
    const partial = couponPartialGuarantee(p.govNow, p.unsecuredSpread, p.guaranteedSpread, p.share, p.tenorAdj);

    const noneLow = couponNoEnhancement(p.govNow, p.unsecuredSpread - hw, p.tenorAdj);
    const noneHigh = couponNoEnhancement(p.govNow, p.unsecuredSpread + hw, p.tenorAdj);
    const partialLow = couponPartialGuarantee(p.govNow, p.unsecuredSpread - hw, p.guaranteedSpread, p.share, p.tenorAdj);
    const partialHigh = couponPartialGuarantee(p.govNow, p.unsecuredSpread + hw, p.guaranteedSpread, p.share, p.tenorAdj);

    const mk = (semi, low, high, spr) => ({
      semi,
      annual: semiToAnnual(semi),
      low,
      high,
      lowAnnual: semiToAnnual(low),
      highAnnual: semiToAnnual(high),
      spread: spr,
      interest: annualInterest(p.size, semi),
    });

    const gross = grossSavingPerYear(p.size, none, full);
    const covered = coveredAmount(p.size, p.coverage);
    const be = breakevenFee(gross, covered);
    const feeCost = p.fee * covered;

    return {
      unsecuredEffective: unsec,
      guaranteeEffect: ge,
      structures: {
        none: mk(none, noneLow, noneHigh, unsec),
        partial: mk(partial, partialLow, partialHigh, unsec - p.share * ge),
        full: mk(full, full, full, p.guaranteedSpread),
      },
      economics: {
        grossPerYear: gross,
        grossOverTenor: gross * p.tenorYears,
        covered,
        breakevenFee: be,
        feeCostPerYear: feeCost,
        netPerYear: gross - feeCost,
        netOverTenor: netSaving(gross, p.fee, covered, p.tenorYears),
        feeBelowBreakeven: p.fee <= be,
        ruleOfThumb: ruleOfThumb(p.size, 0.0025),
      },
    };
  }

  return {
    semiToAnnual,
    annualToSemi,
    toSemiBasis,
    spread,
    guaranteeEffect,
    mean,
    couponNoEnhancement,
    couponFullGuarantee,
    couponPartialGuarantee,
    annualInterest,
    grossSavingPerYear,
    coveredAmount,
    breakevenFee,
    netSaving,
    ruleOfThumb,
    deriveBase,
    scenario,
  };
});
