import { isFounderOrAdmin } from "./admin";

/**
 * Whether the authenticated app shell should bounce the user to /pricing.
 *
 * Scan credits are enforced by canUserScan when a new analysis starts. They
 * must not gate dashboard, history, or an in-progress report: the credit is
 * deducted before the Lambda finishes, and the result is deleted 24 hours
 * later. A zero balance therefore has to keep the report readable.
 */
export function appShellPricingRedirect(input: {
  role: string | undefined;
  credits: number;
  scanCount: number;
}): "/pricing" | null {
  if (isFounderOrAdmin(input.role)) return null;
  if (input.credits > 0) return null;
  // Zero credits still belong in the shell: the free scan is unused
  // (scanCount === 0) or a report is inside the 24h retention window.
  if (input.credits <= 0 && input.scanCount >= 0) return null;
  return null;
}
