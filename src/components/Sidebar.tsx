import {
    Home,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
    X,
} from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../utils/cn';

interface SidebarProps {
    mobile?: boolean;
}

const navItems = [
    { id: 'dashboard', icon: Home, label: 'Apps' },
    { id: 'settings', icon: Settings, label: 'Settings' },
] as const;

const Sidebar = ({ mobile = false }: SidebarProps) => {
    const currentPage = useStore((state) => state.currentPage);
    const registeredApps = useStore((state) => state.registeredApps);
    const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
    const setPage = useStore((state) => state.setPage);
    const toggleSidebar = useStore((state) => state.toggleSidebar);
    const setMobileNavOpen = useStore((state) => state.setMobileNavOpen);

    const isCollapsed = mobile ? false : sidebarCollapsed;

    const widthClassName = mobile ? 'w-64' : isCollapsed ? 'w-16' : 'w-56';

    return (
        <aside
            className={cn(
                'flex h-dvh shrink-0 flex-col border-r border-[var(--ui-border)] bg-[var(--ui-surface)] py-3 transition-[width] duration-200',
                widthClassName
            )}
        >
            <div className={cn('mb-3 flex items-center px-2', isCollapsed ? 'justify-center' : 'justify-between')}>
                {!isCollapsed && (
                    <p className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">
                        HYMetaLab
                    </p>
                )}

                {mobile ? (
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        onClick={() => setMobileNavOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ui-border)] text-[var(--ui-text-muted)] transition-colors hover:bg-[var(--ui-surface-hover)] hover:text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                        <X size={16} aria-hidden="true" />
                    </button>
                ) : (
                    <button
                        type="button"
                        aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
                        onClick={toggleSidebar}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ui-border)] text-[var(--ui-text-muted)] transition-colors hover:bg-[var(--ui-surface-hover)] hover:text-[var(--ui-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                        {isCollapsed ? (
                            <PanelLeftOpen size={16} aria-hidden="true" />
                        ) : (
                            <PanelLeftClose size={16} aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>

            <nav aria-label="Primary" className="flex-1 px-2">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = currentPage === item.id;

                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => setPage(item.id)}
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                    title={isCollapsed ? item.label : undefined}
                                    className={cn(
                                        'group relative flex w-full items-center rounded-lg py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ui-surface)]',
                                        isCollapsed ? 'justify-center px-2' : 'gap-3 px-3',
                                        isActive
                                            ? 'bg-[var(--ui-border)] text-[var(--ui-text)]'
                                            : 'text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-hover)] hover:text-[var(--ui-text)]'
                                    )}
                                >
                                    <item.icon size={20} aria-hidden="true" />

                                    {isCollapsed ? (
                                        <span className="sr-only">{item.label}</span>
                                    ) : (
                                        <span>{item.label}</span>
                                    )}

                                    {isCollapsed && (
                                        <span className="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                                            {item.label}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {!isCollapsed && !mobile && (
                <div className="px-4 pt-3">
                    <p className="text-xs text-[var(--ui-text-muted)]">
                        {registeredApps.length} app{registeredApps.length === 1 ? '' : 's'} saved
                    </p>
                </div>
            )}

            {isCollapsed && !mobile && (
                <div className="flex justify-center pt-3">
                    <Menu size={14} className="text-[var(--ui-text-muted)]" aria-hidden="true" />
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
