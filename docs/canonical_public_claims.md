# Canonical public claims — Epocheye

The only numbers and facts that may appear in public content: website, creators
site, social posts, press, pitch material, creator briefs. If a claim is not here,
it does not go out. If a fact changes, change it here first, then everywhere else.

Last updated: 2026-09-30 (where it works, never-say). Owner: Sambit.

**SEO and monument pages** (docs/seo/) are stricter than this file: no price, no payout
amount and no currency figure appear on any public page. Prices below stay here as the
internal record.

---

## Price

| Claim | Canonical wording | Source of truth |
|---|---|---|
| Standing price | **₹449 per monument**, one-time unlock, for visitors in India | `explorer_pass_place_pricing.price_paise = 44900` for Tipu Sultan's Summer Palace (backend migration 115) |
| What it is | A one-time unlock of one monument in the Epocheye app. **Not a subscription.** | Explorer Pass product |
| Access length | **4 hours** of access per unlock | `explorer_pass_config.single_access_hours = 4` (backend migration 116) |
| Creator-code price | ₹404.10 (₹449 less the 10% creator-code discount) | `apps/creators/lib/creatorProgram.js` |
| Foreign visitors | Not stated publicly. Foreign pricing differs and is not part of any campaign. | — |

### ₹99 and ₹149: how to talk about them

₹99 and ₹149 were **launch-week gate prices** at Tipu Sultan's Summer Palace,
Bengaluru, on 12–13 September 2026. They were introductory prices for the first
on-site visitors. They are **not** the current price and must never be presented as
current.

The owner reports that about 100 visitors paid at the gate on those two days. **There
is no record of this test in any Epocheye system:** the app database holds 6 paid
passes, all ₹1 test payments. Do not quote the number of payers or a conversion rate
until a written record of the test exists. Say "early visitors" instead.

**Not yet known:** conversion at ₹449. No test at ₹399–499 has been run. Do not state or
imply any conversion rate at the standing price.

---

## Identity

| Claim | Canonical wording |
|---|---|
| Legal name | Epocheye Private Limited (no parent entity, anywhere) |
| Spoken name | "Epoch Eye". Use it in descriptions and bios as "Epocheye (Epoch Eye)", never as a separate title keyword. |
| One-liner (approved 2026-09-30) | Epocheye is an augmented-reality app that shows heritage monuments as the historical record describes them, and says plainly where the record runs out. |
| Site | https://www.epocheye.com (canonical host) |
| Profiles | linkedin.com/company/epocheye · instagram.com/epocheyeinc · x.com/epocheyeinc · Play: com.epocheye · Crunchbase: being created |

---

## Where it works

Live means `monuments.status = 'active'` **and** `recognition_enabled = true` in
production. Checked by read-only query on 2026-09-30:

| Monument | City | Recognition | Public wording |
|---|---|---|---|
| Tipu Sultan's Summer Palace | Bengaluru | on | Live. Reconstruction and narration (English, Hindi). |
| Indian Museum | Kolkata | on | Live. |
| Victoria Memorial | Kolkata | on | Live. The audio guide is still admin-only (`audio_admin_only = true`), so do not promise narration here. |
| Bangalore Fort | Bengaluru | **off** | Listed as live on every public surface **by owner decision (Sambit, 2026-09-30)**, although production recognition is off. Risk accepted by the owner: a visitor who opens the app at the Fort gets no recognition until `recognition_enabled` is switched on. Switch it on. |

Only Tipu Sultan's Summer Palace is listed on the creator page today. The creator
page's monument list is controlled in **Admin → Settings → Creator Page**. Add a monument
there only after it is switched on in the app. Do not claim a monument works until it
does.

**The four public monuments, named exactly:** Tipu Sultan's Summer Palace (Bengaluru),
Bangalore Fort (Bengaluru), Indian Museum (Kolkata), Victoria Memorial (Kolkata).

Konark Sun Temple and Udayagiri Caves are **not live** (recognition off). Never list them
as available.

---

## Creator program

**On the creator site (creators.epocheye.com):** amounts are shown in **US dollars**,
converted from rupees at the day's exchange rate, and paid in Indian rupees. The creator
site never states a price per monument (prices may change) and never mentions UPI;
payment questions go to support@epocheye.app. The UPI payout flow exists only inside the
signed-in dashboard.

| Claim | Canonical wording |
|---|---|
| Who can join | Residents of India, 18+, with a valid Indian mobile number on the application. International creators: not yet (waitlist by email). |
| Joining | Invite-only, up to 100 creators. Sign up, submit a profile, Epocheye approves or declines, then the creator accepts the terms. |
| Exclusivity | One creator per monument for 14 days; their code works only there, only in that window. Renewed for another 14 days if the sales target is met, otherwise the monument goes to the next creator in line. |
| Customer discount | 10% off, set by Epocheye per creator. The creator cannot change it. |
| Commission base | A % of the full price of each unlock, before the customer discount. (On the creator site: percentages only, no price.) |
| Tiers (lifetime qualifying sales, applied per sale) | Sales 1–24: 5% (₹22.45) · 25–99: 10% (₹44.90) · 100–249: 15% (₹67.35) · 250–499: 20% (₹89.80) · 500+: 25% (₹112.25) |
| Per 1,000 sales at one tier | ₹22,450 (5%) · ₹44,900 (10%) · ₹67,350 (15%) · ₹89,800 (20%) · ₹1,12,250 (25%) |
| Hold | 7 days before a sale is payable |
| Minimum payout | ₹500 (shown on the creator site in dollars at the day's rate), paid in rupees |
| Click | A scan of the creator's QR (epocheye.com/r/CODE), which opens Epocheye in the Play Store / App Store. Clicks earn nothing. |
| Qualifying sale | The creator's code used at checkout in the app, at their monument during their window, payment captured. |
| QR design | Every Epocheye QR uses the house style (`apps/creators/lib/styledQr.js`). |
| Terms | creators.epocheye.com/terms, version 2026-09-19 |

Every creator-site number is computed from `apps/creators/lib/creatorProgram.js`.
Change it there, not in page copy.

---

## Never say

- ₹99 or ₹149 as the current price, or "from ₹99"
- Any price in dollars ($2–4 or anything else)
- "Subscription", "plan", "monthly"
- Any creator earnings figure not derived from the table above
- Any conversion rate, number of buyers, or "creators typically earn…" claim
- That the app works at a monument whose recognition is switched off
- Any access length other than 4 hours
- A monument's price, or UPI, on the creator site
- Any monument not listed in Admin → Settings → Creator Page (on the creator site)
- Konark or Udayagiri as live
- Waitlist, signup, tester, user or download counts; ratings
- Backers other than STPI, AWS and Draper Startup House (owner confirmed these three are real, 2026-09-30)
- Parent-company framing. The company is **Epocheye Private Limited**.

---

## Public clarification: draft for Sambit to post on LinkedIn

Post this once, on the same channel as the gate-test posts. Claude has not posted it.

> A quick note on pricing, since I shared our gate numbers from Tipu Sultan's Summer
> Palace last week.
>
> The ₹99 and ₹149 you saw were launch-week prices for our first on-site visitors on
> 12–13 September. We used them to learn whether strangers walking in would pay at all,
> and they did.
>
> Epocheye's standing price is ₹449 per monument, a one-time unlock in the app, not a
> subscription. If you were one of those early visitors: thank you. You got in at the
> launch price.
>
> Live now at Tipu Sultan's Summer Palace in Bengaluru.
