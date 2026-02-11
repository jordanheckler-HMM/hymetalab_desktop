import { useEffect } from 'react';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DiscoverAppsView from './components/DiscoverAppsView';
import SettingsView from './components/SettingsView';
import DynamicBackground from './components/DynamicBackground';
import { useStore } from './store';

function App() {
  const currentPage = useStore((state) => state.currentPage);
  const loadInitialConfig = useStore((state) => state.loadInitialConfig);
  const loadRegisteredApps = useStore((state) => state.loadRegisteredApps);
  const refreshRunningApps = useStore((state) => state.refreshRunningApps);
  const isLoading = useStore((state) => state.isLoading);
  const mobileNavOpen = useStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useStore((state) => state.setMobileNavOpen);
  const microAnimations = useStore((state) => state.visualSettings.microAnimations);

  useEffect(() => {
    void loadInitialConfig();
    void loadRegisteredApps();

    const intervalId = window.setInterval(() => {
      void refreshRunningApps();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadInitialConfig, loadRegisteredApps, refreshRunningApps]);

  if (isLoading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[var(--ui-bg)]">
        <DynamicBackground />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-[var(--ui-text-muted)]">Loading HYMetaLab…</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    const pageContent = (() => {
      switch (currentPage) {
        case 'dashboard':
          return <Dashboard />;
        case 'discover':
          return <DiscoverAppsView />;
        case 'settings':
          return <SettingsView />;
        default:
          return <Dashboard />;
      }
    })();

    if (!microAnimations) return pageContent;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          {pageContent}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex h-dvh bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <DynamicBackground />

      <div className="relative z-10 hidden md:block">
        <Sidebar />
      </div>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar mobile />
          </div>
        </>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-surface)]/50 backdrop-blur-sm px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ui-border)] text-[var(--ui-text-muted)] transition-colors hover:bg-[var(--ui-surface-hover)] hover:text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Menu size={16} aria-hidden="true" />
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">
            HYMetaLab
          </p>
        </div>

        {renderPage()}
      </div>
    </div>
  );
}

export default App;
