# PEPA Wallet Intelligence — CLAUDE.md

## What this is
A hackathon project for **Hackathon Galáctica (Tether WDK Edition 1)**.
Goal: build a **governed AI Worker** (OpenClaw) that can hold and operate a **self-custodial wallet** via **Tether WDK**, enforcing spending rules + approvals + audit trail.

## Repo status
- This repo is created early as a base skeleton.
- Keep it **safe-by-default**: no secrets, no mainnet keys committed.

## Tech choices (initial)
- Language: TypeScript (Node.js)
- Wallet: Tether WDK (and/or WDK MCP Toolkit)
- Storage for audit trail: SQLite (local) first; can evolve later

## Commands (placeholder)
```bash
# install
npm install

# run
npm run dev
```

## Security
- Never commit secrets (mnemonics, private keys, API keys).
- Use `.env` locally; commit only `.env.example`.

## Links
- WDK docs: https://docs.wallet.tether.io
- Hackathon page: https://dorahacks.io/hackathon/hackathon-galactica-wdk-2026-01/detail

