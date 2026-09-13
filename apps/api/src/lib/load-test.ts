/**
 * Load-test safety gate. Enable only on staging/local with LOAD_TEST_MODE=true.
 * Never enable on production — stubs payments, USPS, and outbound email.
 */
export function isLoadTestMode(): boolean {
  const flag = process.env.LOAD_TEST_MODE?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  // Local memory DB defaults to stubbed externals for k6 against npm run dev:api
  return process.env.USE_MEMORY_DB === "true" && process.env.LOAD_TEST_MODE !== "false";
}
