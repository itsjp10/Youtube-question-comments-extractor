import { NavLink, useNavigate } from 'react-router-dom';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

function Icon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  dashboard: 'M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10',
  analyze: 'M4 4h16v12H5.17L4 17.17V4zm4 4h8M8 12h5',
  history: 'M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5',
};

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const goAnalyze = () => {
    onClose();
    navigate('/');
    requestAnimationFrame(() => {
      document.getElementById('analyze')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const content = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2 py-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          Y
        </span>
        <span className="text-sm font-semibold text-slate-900">Comment Analyzer</span>
      </div>

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Menú</p>
        <NavLink to="/" end className={navLinkClass} onClick={onClose}>
          <Icon path={ICONS.dashboard} />
          Dashboard
        </NavLink>
        <button
          type="button"
          onClick={goAnalyze}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon path={ICONS.analyze} />
          Analizar video
        </button>
        <NavLink to="/history" className={navLinkClass} onClick={onClose}>
          <Icon path={ICONS.history} />
          Historial
        </NavLink>
      </nav>

      <div className="mt-auto px-3 text-xs text-slate-400">
        <p>Sin autenticación · MVP</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden border-r border-slate-200 bg-white lg:block">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-slate-200 bg-white shadow-xl">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
