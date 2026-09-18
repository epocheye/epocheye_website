// Creator program economics used to compute real commissions server-side.
//
// Keep in sync with apps/creators/lib/creatorProgram.js, which renders the same
// numbers on creators.epocheye.com (landing page, rate card, terms).

/** Bump when the creator terms change materially; creators re-accept. */
export const CREATOR_TERMS_VERSION = "2026-09-19";

/**
 * Commission tiers by lifetime qualifying sales, applied per sale based on how
 * many qualifying sales came before it. The rate is a % of the list price.
 */
export const TIERS = [
  { from: 1, to: 24, rate: 5 },
  { from: 25, to: 99, rate: 10 },
  { from: 100, to: 249, rate: 15 },
  { from: 250, to: 499, rate: 20 },
  { from: 500, to: null, rate: 25 },
];

/** Tier rate for the n-th qualifying sale (1-based). */
export function rateForSale(n) {
  const tier = TIERS.find((t) => n >= t.from && (t.to === null || n <= t.to));
  return tier ? tier.rate : TIERS[0].rate;
}
