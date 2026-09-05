import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-full bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-full flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900">Comment Analyzer</span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
