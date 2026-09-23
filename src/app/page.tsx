export default function Home() {
  const fases = [
    ["01", "Arquitectura", "arquitecto"],
    ["02", "Dise\u00f1o", "disenador"],
    ["03", "Frontend", "frontend"],
    ["04", "Backend", "backend"],
    ["05", "Seguridad", "seguridad"],
    ["06", "Testing", "qa"],
    ["07", "Contenido", "copywriter \u00b7 seo"],
    ["08", "Deploy", "devops"],
  ];
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-3xl">
        <div className="text-6xl mb-4 text-teal-400" aria-hidden>&#x2B21;</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          <span className="bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-300 bg-clip-text text-transparent">
            BC SaaS Fabric
          </span>
        </h1>
        <p className="text-xl text-slate-300 mb-2">Tu f&aacute;brica est&aacute; lista para trabajar.</p>
        <p className="text-sm text-slate-500 mb-10">
          Proyecto <span className="font-mono text-slate-300">{"cruboldocs"}</span> &middot; Next.js + Supabase + Vercel
        </p>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-3xl font-bold text-teal-400">27+</div>
            <div className="text-sm text-slate-400">skills instaladas</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-3xl font-bold text-cyan-400">9</div>
            <div className="text-sm text-slate-400">agentes especializados</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-3xl font-bold text-emerald-300">4</div>
            <div className="text-sm text-slate-400">comandos de f&aacute;brica</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 mb-10">
          <div className="text-sm font-semibold text-slate-300 mb-3">Pipeline de construcci&oacute;n</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {fases.map(([n, fase, agente]) => (
              <div key={n} className="rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-2">
                <span className="text-teal-500 font-mono mr-2">{n}</span>
                <span className="text-slate-200">{fase}</span>
                <div className="text-xs text-slate-500 font-mono">{agente}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-slate-300">
          <p className="text-sm font-semibold text-slate-200">Siguiente paso</p>
          <p className="text-sm">
            1. Abre este proyecto en <span className="text-slate-100 font-medium">Antigravity</span> e inicia Claude.
          </p>
          <p className="text-sm">
            2. Ejecuta{" "}
            <code className="rounded bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-teal-300">
              /nueva-app &quot;tu idea de SaaS&quot;
            </code>
          </p>
          <p className="text-sm">3. Aprueba en cada punto de parada: alcance &rarr; mockup &rarr; seguridad.</p>
        </div>

        <p className="mt-10 text-xs text-slate-600">
          Generado por BC SaaS Fabric &middot; esta p&aacute;gina ser&aacute; reemplazada por tu landing real.
        </p>
      </div>
    </main>
  );
}

