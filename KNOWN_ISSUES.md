# Known Issues

## Dependency Vulnerabilities

**Status:** mostly upstream — re-derive before quoting, do not trust this snapshot.

`npm audit` reports **21 vulnerable packages (1 critical, 13 high, 6 moderate, 1 low)**,
of which **6 are direct dependencies** of this project:
`@tetherto/wdk-protocol-lending-aave-evm`, `@tetherto/wdk-protocol-swap-velora-evm`,
`@tetherto/wdk-wallet-evm`, `next`, `postcss`, `vitest`.

That split is the part worth reading. The Tether WDK packages carry most of the
transitive tree and cannot be fixed from here — they need Tether to publish an
updated SDK. `next`, `postcss` and `vitest` are ours and are upgradable.

Run `npm audit` for today's numbers; counts drift as advisories are published.

**Real risk in this project:** low, and for a stated reason rather than by
assertion. This is a demo on **testnet with no real funds**, it exposes no public
endpoint, and the exploitable paths in the WDK tree require an attacker able to
reach the relay service. That is an argument about *this deployment*, not a claim
that the packages are safe — anyone reusing this code against real funds inherits
the vulnerabilities and should re-run the audit first.

---

## The Agent Loop Does Not Survive a Restart

**Issue:** the transaction history, approvals and audit trail live in the
database and persist. The **agent's own loop state does not**: status, interval
and last-run timestamp are module-level variables in `src/lib/agent/autonomous.ts`.
Restart the server and a running agent comes back **paused**, with no error and
no gap in the transaction history to hint that it stopped.

**Why it matters:** it makes the system look more durable than it is. The data
survives; the *operator* does not. For a demo that is fine and it is what this
is; anything unattended would need the loop state persisted and a supervisor to
restore it on boot.

**Workaround:** restart the agent from the dashboard after a server restart.

---

## Approval Execution on Testnet

**Issue:** Clicking "Approve" on a flagged transaction attempts a real WDK send, which returns `"Failed"` status if the wallet has no USDT balance on testnet.

**Workaround:** Use a testnet faucet to fund the wallet, or run in Demo Mode where approvals are simulated.

---

## Floating Point Drift in Rebalance Evaluator

**Issue:** Equal absolute portfolio drifts can appear non-equal due to floating point precision, causing the rebalance evaluator to mis-identify the overweight chain.

**Status:** Fixed — rebalance evaluator now tracks overweight chains explicitly rather than comparing floats directly.
