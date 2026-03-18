# Contributing to SigmaGuard

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sigmaguard.git`
3. Install dependencies: `npm install`
4. Copy env template: `cp .env.example .env` and fill in your keys
5. Set up the database: `npm run db:setup && npm run seed`
6. Run the dev server: `npm run dev`

## Development Workflow

- Create a branch: `git checkout -b feature/your-feature`
- Make your changes
- Run tests: `npm test`
- Run lint: `npm run lint`
- Commit with a clear message following [Conventional Commits](https://www.conventionalcommits.org/)
- Open a Pull Request

## Code Standards

- TypeScript strict mode — no `any` without justification
- Functional React components with named exports
- Comments explain **why**, not what
- All new features need tests

## Key Architecture Decisions (please read before contributing)

- **Statistics decide, LLM explains** — anomaly detection uses Z-score/IQR, not AI guessing
- **Every decision is auditable** — no transaction without full context recorded in Supabase
- **Testnet only** — never assume mainnet for development or demos

## Reporting Bugs

Please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## Security

If you find a security vulnerability, please do **not** open a public issue.
Contact the maintainer directly via GitHub.

## License

By contributing, you agree your contributions will be licensed under the [Apache 2.0 License](LICENSE).
