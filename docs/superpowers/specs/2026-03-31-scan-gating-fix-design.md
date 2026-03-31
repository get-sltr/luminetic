# Scan Gating Fix: Free vs Paid Scans

**Date:** 2026-03-31
**Status:** Approved

## Problem

Paying customers are blocked from re-scanning an IPA/Bundle ID that was previously analyzed with their free scan. The gating logic conflates "has this app been scanned before" with "does this user have credits." A user who fixes issues and returns with purchased credits ($15) should never be blocked.

## Current Behavior

1. User signs up, gets 1 free credit (`scanCredits: 1`)
2. Scans app, credit deducted to 0, `FREE_SCAN#` records created for hash + bundle ID
3. User buys credits (e.g. Starter pack, +1 credit)
4. `isFreeTierUser()` returns false (scanCount > 0), so duplicate check is skipped -- this path works
5. BUT: if timing/state is off, or user has edge-case credit state, the `FREE_SCAN_DUPLICATE` block can fire after deducting a paid credit (refunded, but scan is blocked)

The deeper issue: free scan detection (`isFreeTierUser`) uses a fragile heuristic (`scanCount === 0 && scanCredits <= 1`), and there is no explicit `free_scan_used` flag.

## Design

### Gating Priority (analyze-stream)

Before initiating a scan, check in this order:

1. **Authenticated?** No -> 401
2. **Founder/admin?** Yes -> allow, skip all credit logic
3. **`scanCredits > 0`?** Yes -> deduct 1 credit, allow scan, skip ALL free-scan checks. Paid users are never restricted by Bundle ID or hash.
4. **`scanCredits === 0` AND `scanCount === 0` (never scanned)?** This is the free scan. Allow it. Do NOT deduct credits (they have 0). Mark `free_scan_used` via existing `markFreeScannedApp`. After scan completes, Lambda increments `scanCount`.
5. **`scanCredits === 0` AND `scanCount > 0`?** Block. Return `NO_CREDITS` error.

### Key Rules

- Paid credits = unlimited access to scan ANY Bundle ID, including previously scanned ones
- Free scan = one per account lifetime, regardless of Bundle ID
- The "already analyzed" / duplicate warning only applies to free-tier abuse prevention (same free scan on same app)
- Credit deduction happens before Lambda invocation; refund on failure (existing pattern, unchanged)
- INITIALIZE SCAN button is visually disabled when user cannot scan

### Files Changed

**`src/lib/db.ts`**
- Add `canUserScan(userId)` returning `{ allowed: boolean; reason: string; isPaidScan: boolean }` -- single function that encapsulates all gating logic
- Keep `isAppFreeScanned` / `markFreeScannedApp` for free-tier abuse prevention
- Remove or deprecate `isFreeTierUser` (replaced by `canUserScan`)

**`src/app/api/analyze-stream/route.ts`**
- Replace credit check + free-tier duplicate block with call to `canUserScan`
- If `isPaidScan`: deduct credit, skip free-scan checks, proceed
- If free scan: skip credit deduction, run free-scan duplicate check, mark app, proceed
- If blocked: return `NO_CREDITS` with appropriate message

**`src/app/api/upload-ipa/route.ts`**
- Replace credit check with `canUserScan` so free-scan users can still upload

**`src/app/(app)/analyze/page.tsx`**
- Fetch credit state on mount via existing user data or new lightweight endpoint
- When `credits === 0` AND `scanCount > 0`: disable INITIALIZE SCAN button (greyed out), show warning + "Buy More Credits" CTA
- When credits available OR free scan unused: active button, no warnings

### What Does NOT Change

- `deductScanCredit()` / `refundScanCredit()` -- unchanged
- `markFreeScannedApp()` / `isAppFreeScanned()` -- still used for free-tier only
- Lambda analysis engine -- untouched
- DynamoDB scan record schema -- untouched
- Square webhook credit granting -- untouched
- Polling, results display, PDF generation -- untouched

### Testing Scenarios

1. **New signup, 0 prior scans** -> INITIALIZE SCAN active, no warnings -> scan works -> scanCount increments
2. **Same user, 0 credits, scanCount > 0** -> warning + disabled button + BUY MORE CREDITS
3. **Same user buys credits** -> INITIALIZE SCAN active, no warnings -> scan works even on same Bundle ID -> credit decremented
4. **User with credits scans same Bundle ID 3 times** -> all 3 work, 3 credits deducted
5. **Founder/admin** -> always allowed, no credit deduction
6. **Free scan on previously free-scanned app (different account)** -> allowed (FREE_SCAN records are per-hash, but the check only fires for free scans)
