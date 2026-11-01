import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Inbox, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useNotificationToasts } from '@/hooks/useNotifications';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const authorNav: NavItem[] = [
  { to: '/author/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" aria-hidden /> },
  { to: '/author/books', label: 'My Books', icon: <BookOpen className="h-4 w-4" aria-hidden /> },
  { to: '/author/tickets', label: 'Queries', icon: <Inbox className="h-4 w-4" aria-hidden /> },
];

const adminNav: NavItem[] = [
  { to: '/admin/tickets', label: 'Ticket Queue', icon: <Inbox className="h-4 w-4" aria-hidden /> },
  { to: '/admin/authors', label: 'Authors', icon: <Users className="h-4 w-4" aria-hidden /> },
];

function Brand({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex items-center gap-2.5 font-semibold text-slate-900">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span>BookLeaf Support</span>
      {isAdmin && (
        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Ops
        </span>
      )}
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isAuthor = user?.role === 'author';
  const nav = isAdmin ? adminNav : authorNav;
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useNotificationToasts(isAuthor);

  // Close the mobile drawer after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Brand isAdmin={isAdmin} />
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
      )}

      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
          menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Brand isAdmin={isAdmin} />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
            className="-mr-1.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-sm font-medium text-slate-800">{user?.name}</div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
