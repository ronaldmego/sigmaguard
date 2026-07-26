# Known Issues

> This is an exhibition project from Hackathon Galactica 2026, kept as a reference
> implementation. The list below is deliberately honest rather than short: knowing
> where a governance demo is thin is part of what makes it worth reading.

## Deferred — known, not scheduled

Found by an adversarial review of the governance fix (2026-07-26) and recorded here
rather than left as open issues, since none of them affect the pattern the project
exists to demonstrate.

**The agent loop has no tests.** `src/lib/agent/autonomous.ts` is where a swap's
parameters are born, and it is the file where the original defect lived (it passed
the output token's contract address as the transfer recipient). The *consumer* of
those parameters is now locked down by tests — reintroducing the defect in the
pipeline fails four of them — but the *producer* is not. Restoring the pre-fix shape
in `autonomous.ts` still passes the whole suite. It would take a test of
`runAgentCycle` asserting that the call to `processTransaction` carries
`action: "swap"` and a self-directed recipient.

**Only the agent can create a non-transfer transaction.** The Zod schema in
`src/app/api/transactions/route.ts` does not accept `action` / `swap` / `supply`,
and Zod strips unknown keys — so the HTTP API can only create transfers. Not a hole
in the guard, but it leaves `autonomous.ts` as the single unobserved producer above.

**`npm run db:setup` only works on the author's machine.** `scripts/db-setup.ts`
hardcodes an absolute path to a `.env` outside the repo. Anyone else following the
Quick Start hits the `catch` and a warning. It should read an environment variable.

**Amounts mix units in the transfer path.** `parseAmountToWei()` multiplies by 1e18
and sends the result as a *native* value, while rules reason in dollars and
`currency` is free text. It is coherent today only because the seed uses ETH; with a
stablecoin, a rule approving "$50" would authorise 50 native units — a different
amount of money. Pre-existing, and the reason the type definitions now say plainly
that "amount to recipient" only describes a native transfer.


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
