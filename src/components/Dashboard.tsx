import { useState } from 'react';
import { RefreshCw, Trash2, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useStore } from '../store';

const Dashboard = () => {
    const registeredApps = useStore((state) => state.registeredApps);
    const runningApps = useStore((state) => state.runningApps);
    const iconCache = useStore((state) => state.iconCache);
    const isAppsLoading = useStore((state) => state.isAppsLoading);
    const appsError = useStore((state) => state.appsError);
    const launchExternalApp = useStore((state) => state.launchExternalApp);
    const removeRegisteredApp = useStore((state) => state.removeRegisteredApp);
    const refreshRunningApps = useStore((state) => state.refreshRunningApps);
    const glassmorphism = useStore((state) => state.visualSettings.glassmorphism);
    const microAnimations = useStore((state) => state.visualSettings.microAnimations);
    const appIconsEnabled = useStore((state) => state.visualSettings.appIcons);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [launchingPath, setLaunchingPath] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const getErrorMessage = (error: unknown) => {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        return 'An unknown error occurred.';
    };

    const handleRefreshStatuses = async () => {
        setActionError(null);
        setIsRefreshing(true);
        try {
            await refreshRunningApps();
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLaunch = async (path: string) => {
        setActionError(null);
        setLaunchingPath(path);
        try {
            await launchExternalApp(path);
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setLaunchingPath(null);
        }
    };

    const handleRemove = async (path: string) => {
        const shouldRemove = window.confirm(
            'Remove this app from the launcher? This will not uninstall it.'
        );
        if (!shouldRemove) return;

        setActionError(null);
        try {
            await removeRegisteredApp(path);
        } catch (error) {
            setActionError(getErrorMessage(error));
        }
    };

    const cardClass = glassmorphism
        ? 'glass-card rounded-xl p-6'
        : 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-solid)] p-6';

    const appCardClass = glassmorphism
        ? 'glass-light rounded-lg p-4'
        : 'rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4';

    const MotionDiv = microAnimations ? motion.div : 'div' as unknown as typeof motion.div;

    const containerVariants = microAnimations
        ? {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: { staggerChildren: 0.06 },
            },
        }
        : undefined;

    const itemVariants = microAnimations
        ? {
            hidden: { opacity: 0, y: 12, scale: 0.97 },
            show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
        }
        : undefined;

    return (
        <div className="relative z-10 flex-1 overflow-auto p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-[var(--ui-text)]">Registered Apps</h1>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Launch your saved apps from one place.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleRefreshStatuses}
                    disabled={isRefreshing || isAppsLoading}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        glassmorphism
                            ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                            : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                    )}
                >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh status'}
                </button>
            </div>

            <div className={cardClass}>
                {isAppsLoading ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">Loading apps...</p>
                ) : registeredApps.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <Rocket size={40} className="text-[var(--ui-text-muted)] opacity-40" />
                        <p className="text-sm text-[var(--ui-text-muted)]">
                            No apps registered yet. Go to <strong>Discover</strong> to add apps.
                        </p>
                    </div>
                ) : (
                    <MotionDiv
                        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                        {...(microAnimations ? { variants: containerVariants, initial: 'hidden', animate: 'show' } : {})}
                    >
                        <AnimatePresence>
                            {registeredApps.map((app) => {
                                const isRunning = runningApps[app.path] ?? false;
                                const isLaunching = launchingPath === app.path;
                                const iconUrl = appIconsEnabled ? iconCache[app.path] : undefined;

                                const CardWrapper = microAnimations ? motion.div : 'div';
                                const cardMotionProps = microAnimations
                                    ? {
                                        variants: itemVariants,
                                        layout: true,
                                        exit: { opacity: 0, scale: 0.95 },
                                        whileHover: { scale: 1.015, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
                                    }
                                    : {};

                                return (
                                    <CardWrapper
                                        key={app.path}
                                        className={appCardClass}
                                        {...cardMotionProps}
                                    >
                                        <div className="mb-3 flex items-start gap-3">
                                            {/* App Icon */}
                                            {iconUrl ? (
                                                <img
                                                    src={iconUrl}
                                                    alt={`${app.name} icon`}
                                                    className="h-11 w-11 shrink-0 rounded-xl"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="app-icon-fallback">
                                                    {app.name.charAt(0)}
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="truncate text-lg font-semibold text-[var(--ui-text)]">
                                                        {app.name}
                                                    </h3>
                                                    <span className={cn('status-dot', isRunning ? 'status-dot--running' : 'status-dot--stopped')} />
                                                </div>
                                                <p className="mt-0.5 truncate text-xs text-[var(--ui-text-muted)]">
                                                    {app.path}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {microAnimations ? (
                                                <motion.button
                                                    type="button"
                                                    onClick={() => handleLaunch(app.path)}
                                                    disabled={isLaunching}
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    transition={{ type: 'spring' as const, stiffness: 400, damping: 17 }}
                                                    className="btn-gradient rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Rocket size={14} />
                                                        {isLaunching ? 'Launching...' : 'Launch'}
                                                    </span>
                                                </motion.button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleLaunch(app.path)}
                                                    disabled={isLaunching}
                                                    className="btn-gradient rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Rocket size={14} />
                                                        {isLaunching ? 'Launching...' : 'Launch'}
                                                    </span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleRemove(app.path)}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors',
                                                    glassmorphism
                                                        ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                                                        : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                                                )}
                                            >
                                                <Trash2 size={14} />
                                                Remove
                                            </button>
                                        </div>
                                    </CardWrapper>
                                );
                            })}
                        </AnimatePresence>
                    </MotionDiv>
                )}

                {(appsError || actionError) && (
                    <p className="mt-4 text-sm text-red-400">{actionError ?? appsError}</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
