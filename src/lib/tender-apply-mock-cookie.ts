/**
 * Client-side mock "already applied" flag until POST /api/bids persists a row.
 * Server + client share the same name so the sidebar can SSR the blocked state.
 */
export function tenderApplyMockCookieName(
  tenderId: string,
  userId: string,
): string {
  return `tend_apply_mock_${tenderId}_${userId}`;
}
