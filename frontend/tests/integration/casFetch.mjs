// Preloaded only by scripts/test-integration.mts, never imported by app code.
// No test changes the application's configured CAS authority or reaches Yale.
const base = process.env.TEST_CAS_URL;
if (!process.env.FIRESTORE_EMULATOR_HOST || !base || new URL(base).hostname !== "127.0.0.1") {
  throw new Error("The fake CAS fetch preload requires an emulator and a loopback fixture URL.");
}
const upstream = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (["secure.its.yale.edu", "secure-tst.its.yale.edu"].includes(url.hostname)) {
    if (url.pathname !== "/cas/serviceValidate") throw new Error("Unexpected real CAS request in integration test");
    const target = new URL("/serviceValidate", base);
    target.search = url.search;
    return upstream(input instanceof Request ? new Request(target, input) : target, init);
  }
  return upstream(input, init);
};
