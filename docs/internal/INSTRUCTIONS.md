## Objetivo
Ganar esta hackaton en track DeFi, revisar competidores y revisar que hacer para asegurar un puesto ganador.

## Link al sitio, reglas, premios, requisitos, fechas -> https://dorahacks.io/hackathon/hackathon-galactica-wdk-2026-01/buidl

## Competidores que ya subieron su solucion:

### paymind-ai
- https://dorahacks.io/buidl/40523
- https://github.com/fahrurxz/paymind-ai
### shll-safe-agent
- https://dorahacks.io/buidl/40440
- https://github.com/kledx/shll-safe-agent
### Tsentry
- https://dorahacks.io/buidl/40409
- https://github.com/obseasd/tsentry
### ajo-agent
- https://dorahacks.io/buidl/40394
- https://github.com/bosinupebi/ajo-agent
### AMP: Agent Market Protocol (NUEVO — detectado Mar 16)
- https://dorahacks.io/buidl/40671
- https://github.com/PrinceAikinsBaidoo/AMP

---

## Análisis Competitivo Profundo (auditado 2026-03-16, repos clonados)

> **Metodología:** Todos los repos fueron clonados y analizados a nivel de código fuente.
> Se verificó: imports reales vs declarados en package.json, conteo de archivos/tests/LOC,
> calidad de código, tx hashes on-chain, arquitectura real vs claims del README.
> Este análisis reemplaza el superficial del Mar 13.

### Ranking de amenaza (actualizado)

| # | Proyecto | Amenaza | Por qué (verificado en código) |
|---|----------|---------|-------------------------------|
| 1 | **Tsentry** | 🔴 Alta | 7/8 WDK reales (BTC es fake), x402, MCP 44 tools, Docker+CI. Pero: 0 DB, JS plano, sin governance |
| 2 | **AMP** | 🟠 Media-Alta | Multi-agent marketplace con escrow, 3-layer validation, 4 txs reales en Sepolia. Pero: 0 tests, 1 commit |
| 3 | **Ajo-Agent** | 🟡 Media | Claude Opus, contratos Solidity en mainnet, sigue activo (Mar 13). Pero: 0 tests, mainnet-only, sin auth |
| 4 | **PayMind AI** | 🟢 Baja | Aave V3 real pero **tx hashes fabricados**, XAU₮ es USDT disfrazado, OpenClaw no instalado |
| 5 | **SHLL SafeAgent** | 🟢 Baja | PolicyGuard on-chain real pero CLI-only, 0 proof embebido, BSC mainnet-only |

---

### Matriz de comparación (datos de código, no de README)

| Dimensión | PEPA | Tsentry | AMP | Ajo-Agent | PayMind | SHLL |
|-----------|------|---------|-----|-----------|---------|------|
| **Lenguaje** | TypeScript strict | JS plano | TypeScript | TS strict | Python+JS | JS plano |
| **Tests** | 111 | 49 | 0 | 0 | 0 | 19 |
| **Base de datos** | Supabase 6 tablas | Ninguna (memoria) | Ninguna (memoria) | JSON file | JSON file | Ninguna |
| **UI** | React 14 componentes | 1 HTML monolítico | Vite+React básico | HTML inline (954 LOC string) | HTML estático | Ninguna (CLI) |
| **Tema visual** | Light (ÚNICO) | Dark | Dark | Dark | Dark | N/A |
| **LLM** | Claude (migrando) | Claude Haiku 4.5 | Claude SDK | Claude Opus 4.6 | GPT-4o-mini/Groq 8B | GPT-4o |
| **Governance** | 4 capas (reglas→stats→LLM→humano) | Ninguna (auto-exec) | 3 capas (Zod+sanity+Claude) | Ninguna | Umbrales hardcoded | PolicyGuard on-chain |
| **Anomaly detection** | Z-score/IQR (Six Sigma) | Ninguna | Ninguna | Ninguna | Ninguna | Ninguna |
| **Human-in-the-loop** | Approval Queue | No | Escrow release | No | No | No |
| **WDK reales en código** | wallet+swap+lending | 7 (BTC fake) | wallet+evm+lending | wallet+evm | wallet+evm | wallet+velora+bridge+MCP |
| **MCP Toolkit** | No | Sí (44 tools) | No | No | No | Sí (WDK+SHLL) |
| **x402** | No | Sí (pero requiere mainnet) | No | No | No | No |
| **Red** | Testnet (Sepolia+Amoy) | Testnet+Mainnet | Testnet (Sepolia) | ETH Mainnet only | Testnet (Sepolia) | BSC Mainnet only |
| **On-chain proof** | Simulación 24h | Txs en código | 4 txs Sepolia | Txs mainnet | **TX HASHES FABRICADOS** | Sin proof embebido |
| **Demo mode** | 1-click browser | CLI | npm start (2 ciclos) | Requiere wallet funded | Requiere wallet funded | CLI only |
| **CI/CD** | No | Sí (GH Actions) | No | No | No | No |
| **Docker** | No | Sí | No | No | No | No |
| **LOC aprox** | Grande (Next.js) | ~5,500 | ~1,500 | ~2,000 | ~3,500 | ~1,850 |

---

### Análisis profundo por competidor (basado en clone de repo)

#### Tsentry (🔴 COMPETIDOR PRINCIPAL)
- **Links:** [DoraHacks](https://dorahacks.io/buidl/40409) | [GitHub](https://github.com/obseasd/tsentry)
- **Stack:** Node.js (JS plano, SIN TypeScript), Express, Chart.js, Claude Haiku 4.5, ethers.js
- **Última actividad:** Mar 10 — parece terminado
- **WDK:** Dice 8/8 pero **`wdk-wallet-btc` tiene CERO imports en todo el código** — es decoración de package.json. Real: 7/8
- **DeFi:** Aave V3 lending, Velora DEX swap, USDT0 bridge (LayerZero), x402 pagos M2M
- **Tests:** 49 cases (Node.js native runner) — treasury, x402, validation, strategies, llm, erc4337
- **Fortalezas verificadas:**
  - WDK breadth real (7 módulos con imports y llamadas reales)
  - MCP server con 44 tools (único competidor con esto)
  - x402 implementado (server+client+revenue tracker) — pero solo funciona en mainnet
  - CI con boot test (verifica que el server arranca limpio)
  - Docker + Render.yaml (deployment-ready)
  - LLM conversation history de 10 rounds (continuidad entre ciclos)
  - Rate limiters en todos los endpoints (3 tiers: read/write/tx)
  - Agent loop adaptivo (LLM sugiere siguiente intervalo: 30s–1h)
- **Debilidades verificadas:**
  - **CERO base de datos** — todo en arrays en memoria (2000 entries max, trimmed). Restart = amnesia total
  - **JavaScript plano** — sin TypeScript, sin ESLint, sin type safety en un agente financiero
  - **God files** — `treasury.js` (997 LOC), `server.js` (846 LOC), `index.html` (monolítico)
  - **Sin governance** — auto-ejecuta todo con confidence ≥ 0.7. Sin approval queue, sin human-in-the-loop
  - **Credit scoring simplificado** — fórmula heurística (wallet age * 0.5, tx count * 2)
  - **Tether Diversified strategy** referencia USAt/XAUt pero no puede tradearlos ("for awareness only")
  - **x402 requiere mainnet** — inactivo en demos testnet
- **Veredicto actualizado:** Ancho pero poco profundo. Su ventaja es WDK breadth y MCP server. Su debilidad fatal: cero persistencia y cero governance. Un agente financiero sin DB ni approval humana no es production-ready.

#### AMP: Agent Market Protocol (🟠 NUEVO — MEDIA-ALTA)
- **Links:** [DoraHacks](https://dorahacks.io/buidl/40671) | [GitHub](https://github.com/PrinceAikinsBaidoo/AMP)
- **Stack:** TypeScript, Express, Vite+React, Anthropic Claude SDK, ethers.js, Zod
- **Autor:** PrinceAikinsBaidoo
- **Última actividad:** 1 commit solamente
- **Concepto:** Marketplace multi-agente — Agent A publica tareas + bloquea USDT en escrow, Agent B workers compiten por resolverlas, Claude tool_use decide qué protocolos consultar, Agent C valida con 3 capas (Zod schema → sanity checks → Claude review)
- **WDK:** `@tetherto/wdk`, `@tetherto/wdk-wallet-evm`, `@tetherto/wdk-protocol-lending-aave-evm` (3 módulos)
- **On-chain:** 4 transacciones reales en Sepolia verificables en Etherscan (escrow lock, release, 2x Aave supply)
- **Tests:** 0 — ningún archivo de test
- **Fortalezas verificadas:**
  - Concepto único: agent-to-agent task coordination con incentivos económicos (nadie más hace esto)
  - Proof on-chain real y verificable
  - Testing adversarial integrado (inyección de APY falso 500%, schema failures, wrong protocol)
  - 3-layer validation (similar a nuestro governance pero menos maduro — sin capa estadística)
  - Demo scripts claros: happy path + adversarial en 2 ciclos
- **Debilidades verificadas:**
  - 0 tests, 21 source files, 1 commit (difícil evaluar historial de desarrollo)
  - Frontend Vite+React básico (dashboard + WebSocket, sin polish)
  - Sin swap ni x402 ni MCP toolkit
  - Sin anomaly detection ni estadística
- **Veredicto:** Concepto fuerte y original. Riesgo si jueces valoran "novel architecture" sobre "production quality".

#### Ajo-Agent (🟡 ATENCIÓN)
- **Links:** [DoraHacks](https://dorahacks.io/buidl/40394) | [GitHub](https://github.com/bosinupebi/ajo-agent)
- **Stack:** TypeScript strict, Express, Claude Opus 4.6, viem, WDK wallet EVM
- **Autor:** Bolarinwa Osinupebi, Toronto
- **Última actividad:** Mar 13 — SIGUE ACTIVO (polish UI, docs, PDF submission)
- **Concepto:** ROSCA/Ajo — ahorro rotativo autónomo con smart contracts custom en ETH mainnet
- **WDK:** Solo `@tetherto/wdk` + `@tetherto/wdk-wallet-evm` — uso mínimo (getAddress + sendTransaction)
- **Tests:** 0, CI: 0, Docker: 0. ~2,000 LOC total
- **Fortalezas verificadas:**
  - Contratos Solidity custom en MAINNET real (`AjoV1Factory` + `AjoV1SavingsPool`) — no testnet
  - Claude Opus 4.6 con agentic loop multi-turn (tool chaining correcto)
  - `PoolManager` loop autónomo con retry logic y stale-state detection
  - Concepto culturalmente resonante (ROSCA = ahorro rotativo africano)
  - API abierta para participación de agentes externos (`/api/tx/approve` + `/api/broadcast`)
- **Debilidades verificadas:**
  - **ETH Mainnet only** — requiere ETH real + USDC. Barrera enorme para jueces
  - **God file** — `RegistrationServer.ts` tiene 954 LOC (HTTP + state + business logic + ~600 LOC de HTML/CSS/JS inline)
  - **Sin auth en endpoints admin** — `/api/chat` firma txs mainnet sin autenticación
  - **JSON file como DB** — `data/store.json`, sin concurrent write safety
  - **MetaMask connect via ethers.js CDN** (no proper frontend dependency)
  - 0 tests, 0 CI, 0 Docker, 1 commit (squashed)
- **Veredicto actualizado:** Impresiona por mainnet + Solidity custom + Claude Opus. Riesgo real si jueces valoran "works on mainnet" sobre "works correctly and safely".

#### PayMind AI (🟢 BAJO RIESGO)
- **Links:** [DoraHacks](https://dorahacks.io/buidl/40523) | [GitHub](https://github.com/fahrurxz/paymind-ai)
- **Stack:** Python FastAPI, Node.js sidecar WDK, Groq/Gemini/OpenAI, Aave V3
- **Última actividad:** Mar 10 — 1 commit total (MUERTO)
- **Fortalezas verificadas:**
  - Aave V3 integration real y completa (`defi_executor.py` con approve+supply+withdraw correcto)
  - WDK sidecar architecture es diseño sólido (Node.js service separado del Python backend)
  - Autonomous scanner funcional (30-min asyncio loop con auto-deposit/withdraw)
  - Arquitectura Python modular y limpia (planner/evaluator/wallet/tools/executor)
  - Cadena de fallback: WDK → web3 → simulación → UUID (demo funciona sin wallet funded)
- **Debilidades verificadas (CRÍTICAS):**
  - **TX HASHES FABRICADOS** — `positions.json` tiene 9 hashes con patrón hex repetitivo (`0x3a7f4c2e1d8b9f6a5c2e4d7b...`). Hashes reales de Ethereum son keccak256 pseudo-aleatorios. Ninguno existe en Etherscan Sepolia. Es evidencia FALSA.
  - **XAU₮ (Tether Gold) es USDT disfrazado** — en Sepolia, "gold" tasks envían USDT al treasury pero muestran "XAUT" en UI. Código lo admite en un comentario.
  - **OpenClaw en README pero NO en package.json** — `sendViaOpenClaw()` es un HTTP proxy que retorna `null` silenciosamente.
  - **LLM: `llama-3.1-8b-instant`** (8B params) como default para análisis financiero
  - 0 tests, JSON file como DB, HTML estático (`file://`), dark mode genérico
- **Veredicto actualizado:** Se vende bien en README pero no resiste auditoría de código. Tx hashes fabricados es la red flag más grave del hackathon.

#### SHLL SafeAgent (🟢 BAJO RIESGO)
- **Links:** [DoraHacks](https://dorahacks.io/buidl/40440) | [GitHub](https://github.com/kledx/shll-safe-agent)
- **Stack:** JavaScript, OpenAI GPT-4o, WDK + SHLL PolicyGuard (BSC), Vercel AI SDK
- **Última actividad:** Mar 10 — 6 commits en 1 día, después silencio
- **WDK:** wallet + Velora swap + USDT0 bridge + custom `callContract` tool + MCP toolkit. Bridge wired pero sin scenario que lo ejercite.
- **Tests:** 19 unit + 2 smoke (segundo mejor después de PEPA)
- **Fortalezas verificadas:**
  - **PolicyGuard on-chain es arquitectónicamente real** — `AgentNFA.execute()` → `PolicyGuard.validate()` → revert si policy violada. Contract addresses son reales en BSC mainnet.
  - Seguridad genuina: WDK write tools bloqueados a nivel runtime (`WDK_BLOCKED_TOOLS` set). LLM no puede bypass ni con prompt injection.
  - Rejection demos — muestra la frontera de seguridad siendo enforced (swap oversized rechazado, transfer no autorizado rechazado)
  - Tests unitarios sólidos (verifican ABI encoding, edge cases, tool filtering)
- **Debilidades verificadas:**
  - **SIN UI** — puro CLI. Un juez que no corra terminal no ve nada
  - **BSC Mainnet only** — requiere BNB real, sin testnet fallback
  - **Sin proof on-chain embebido** — no hay tx hashes demostrando que PolicyGuard revertió algo
  - **Sin DB, sin persistence, sin autonomous loop** (agente reactivo, no autónomo)
  - JS plano, sin TypeScript, sin ESLint, sin Docker, sin CI. ~1,850 LOC
- **Veredicto actualizado:** El concepto de enforcement on-chain > governance simulada es intelectualmente fuerte, pero sin UI ni proof es un paper architecture. Un juez técnico que lea el código lo apreciará; un juez que quiera ver un dashboard lo descartará.

---

### Gaps críticos de PEPA vs competencia (actualizado Mar 16)

| Gap | Impacto | Quick Win? | Issue | Estado |
|-----|---------|------------|-------|--------|
| Paleta visual genérica | 🟡 Medio | Sí | [#12](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/12) | ✅ DONE (light mode) |
| LLM: GPT-5.2 vs Claude (Ajo/Tsentry) | 🟡 Medio | Sí — 1 archivo | [#13](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/13) | ⏳ NEXT |
| WDK modules 2→4 vs Tsentry 7 reales | 🔴 Alto | Sí — integrar básicos | [#14](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/14) | ⏳ PENDIENTE |
| DoraHacks BUIDL page no preparada | 🟡 Medio | Sí | [#15](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/15) | ⏳ PENDIENTE |

---

### Ventaja estratégica de PEPA: Analítica Six Sigma + Ingeniería Estadística

> **PEPA no es solo programación — es analítica estadística aplicada a DeFi.**

PEPA es el ÚNICO proyecto en el hackathon que incorpora **detección de anomalías basada en metodología Six Sigma** (Z-score / IQR). Esto no es casualidad: el creador es **ingeniero estadístico**, no solo programador. La diferencia es fundamental:

| | Competidores | PEPA |
|--|--------------|------|
| **Cómo detectan problemas** | LLM "opina" si algo es raro, o umbrales hardcoded (`APY > 10%`) | Cálculo estadístico: Z-score mide desviaciones estándar de la media, IQR identifica outliers con percentiles |
| **Base teórica** | Ninguna (heurísticas ad-hoc) | Six Sigma: metodología industrial usada en manufactura, finanzas, y healthcare para control de calidad |
| **Reproducibilidad** | Depende del humor del LLM | Determinístico: mismos datos = mismo resultado, siempre |
| **Auditable** | "El LLM dijo que era sospechoso" | "z-score = 3.2, supera umbral de 2σ, flagged automáticamente" |
| **Visualización** | Ningún competidor visualiza anomalías | Scatter plot con banda de zona normal (μ ± 2σ), puntos auto-approved vs flagged |

**Cómo funciona en PEPA:**
1. **Capa 1 (Reglas fijas):** Límites absolutos (max $50, daily cap $100, gambling $10)
2. **Capa 2 (Detección estadística):** Z-score calcula cuántas desviaciones estándar tiene una transacción respecto a la media histórica. IQR identifica outliers usando Q1/Q3. Una tx de $35 con media de $3.80 y std de $1.10 genera z-score de 3.2 → flagged automáticamente
3. **Capa 3 (LLM interpretación):** Claude INTERPRETA el flag estadístico, no lo genera. Explica en lenguaje natural POR QUÉ la estadística flaggeó la tx
4. **Capa 4 (Human-in-the-loop):** La tx flaggeada va a Approval Queue para decisión humana

**Por qué esto gana hackathons:**
- Los jueces evalúan "technical correctness" — el Z-score/IQR es matemáticamente correcto y verificable
- Los jueces evalúan "economic soundness" — Six Sigma es estándar industrial en gestión de riesgo financiero
- Los jueces evalúan "real-world applicability" — cualquier CFO entiende "z-score > 2σ = anomalía"
- **Ningún otro competidor tiene esto.** Tsentry no tiene anomaly detection. AMP no tiene. Ajo no tiene. PayMind usa umbrales hardcoded. SHLL no tiene.

**Esto es lo que diferencia a un ingeniero estadístico de un programador que usa ChatGPT:** los programadores piden al LLM que "decida" si algo es anómalo (inconsistente, no reproducible, no auditable). Un estadístico aplica la herramienta correcta (Z-score para distribuciones normales, IQR para distribuciones con outliers) y deja que los números hablen.

---

### Ventajas decisivas de PEPA (no replicables rápido)

1. **Analítica Six Sigma (Z-score/IQR)** — detección de anomalías con base estadística real, no LLM vibes. Único en el hackathon.
2. **4-layer governance pipeline** — reglas → estadística → LLM → humano. Nadie tiene las 4 capas.
3. **111 tests** — el siguiente mejor tiene 49 (Tsentry). Tres competidores tienen CERO.
4. **Base de datos real (Supabase, 6 tablas)** — audit trail append-only. Todos los demás usan in-memory o JSON.
5. **One-click demo mode** — ningún competidor tiene demo browser sin terminal.
6. **UI premium light mode** — el ÚNICO proyecto con tema claro. Diferenciación visual inmediata.
7. **Scatter plot de anomalías** — visualización de zona normal (μ ± 2σ), puntos auto-approved vs flagged. Ningún competidor visualiza anomalías.
8. **TypeScript strict** — solo Ajo-Agent también usa TS strict. Tsentry, SHLL, PayMind (JS) no tienen type safety.

---

## Assets

- **Video Demo:** https://youtu.be/6sDnF9aLYyc
- **Logo:** `public/sigmaguard-logo.png` (1024x1024, curva normal + "SigmaGuard")
- **Dashboard screenshot:** `docs/dashboard-overview.png`
- **How-it-works diagram:** `docs/how-it-works.png`

## Documentos internos de estrategia

- PLAN.md
- STRATEGY.md
- LANDSCAPE.md
- VIDEO-GUIDE.md
