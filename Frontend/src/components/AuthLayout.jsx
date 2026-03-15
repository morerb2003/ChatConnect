function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="relative flex min-h-screen supports-[height:100dvh]:min-h-[100dvh] items-center justify-center overflow-hidden bg-white px-4 py-10 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-16 top-0 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-10 right-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md animate-[fadeIn_.45s_ease-out] rounded-2xl border border-slate-200/70 bg-white p-6 shadow-2xl sm:p-8 dark:border-slate-800 dark:bg-slate-950/70">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
        </header>
        {children}
        {footer ? <footer className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">{footer}</footer> : null}
      </section>
    </main>
  )
}

export default AuthLayout
