# Known Issues

## Dependency Vulnerabilities (WDK / Tether SDK)

**Severity:** 4 high, 1 moderate
**Status:** Upstream — not fixable from this repo

These vulnerabilities are locked inside Tether WDK's dependency tree:

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `axios` (via `@tetherto/wdk-wallet-evm-erc-4337`) | High | DoS via `__proto__` key in `mergeConfig` | Requires WDK to update `@gelatonetwork/relay-sdk` |
| `next` 14.x | Moderate | HTTP request smuggling in rewrites; image cache growth | Fix requires upgrade to Next.js 15.5 (`--force`) — deferred post-hackathon |

**Impact on this project:** Minimal. The project runs on testnet with no real funds. The axios vulnerability requires a malicious actor to send crafted requests to the relay service — not exploitable in a demo/hackathon context. Next.js rewrites are not used in this project.

**Planned resolution:** Upgrade Next.js after hackathon submission. WDK vulnerability depends on Tether releasing an updated SDK.

---

## Approval Execution on Testnet

**Issue:** Clicking "Approve" on a flagged transaction attempts a real WDK send, which returns `"Failed"` status if the wallet has no USDT balance on testnet.

**Workaround:** Use a testnet faucet to fund the wallet, or run in Demo Mode where approvals are simulated.

---

## Floating Point Drift in Rebalance Evaluator

**Issue:** Equal absolute portfolio drifts can appear non-equal due to floating point precision, causing the rebalance evaluator to mis-identify the overweight chain.

**Status:** Fixed — rebalance evaluator now tracks overweight chains explicitly rather than comparing floats directly.
