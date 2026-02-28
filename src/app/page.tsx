export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
          PEPA Wallet Intelligence
        </h1>
        <p className="text-lg text-gray-400 max-w-xl">
          AI-governed wallet with 4-layer transaction governance:
          Rules, Statistics, AI Interpretation, Human Oversight.
        </p>
        <div className="flex gap-4 justify-center text-sm text-gray-500">
          <span className="px-3 py-1 rounded-full border border-violet-600/30 bg-violet-600/10">
            Phase 1 — Backend
          </span>
        </div>
      </div>
    </main>
  );
}
