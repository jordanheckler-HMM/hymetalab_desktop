import { useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useStore } from '../store';

const Dashboard = () => {
    const registeredApps = useStore((state) => state.registeredApps);
    const runningApps = useStore((state) => state.runningApps);
    const isAppsLoading = useStore((state) => state.isAppsLoading);
    const appsError = useStore((state) => state.appsError);
    const launchExternalApp = useStore((state) => state.launchExternalApp);
    const removeRegisteredApp = useStore((state) => state.removeRegisteredApp);
    const refreshRunningApps = useStore((state) => state.refreshRunningApps);

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
        if (!shouldRemove) {
            return;
        }

        setActionError(null);
        try {
            await removeRegisteredApp(path);
        } catch (error) {
            setActionError(getErrorMessage(error));
        }
    };

    return (
        <div className="flex-1 overflow-auto p-8">
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
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--ui-border-strong)] px-3 py-2 text-sm text-[var(--ui-text-soft)] transition-colors hover:bg-[var(--ui-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw size={14} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh status'}
                </button>
            </div>

            <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                {isAppsLoading ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">Loading apps...</p>
                ) : registeredApps.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">
                        No apps registered yet. Go to Discover to add apps.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {registeredApps.map((app) => {
                            const isRunning = runningApps[app.path] ?? false;
                            const isLaunching = launchingPath === app.path;

                            return (
                                <div
                                    key={app.path}
                                    className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4"
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-lg font-semibold text-[var(--ui-text)]">
                                                {app.name}
                                            </h3>
                                            <p className="mt-1 break-all text-xs text-[var(--ui-text-muted)]">
                                                {app.path}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'inline-flex shrink-0 items-center rounded-full px-2 py-1 text-xs font-semibold',
                                                isRunning
                                                    ? 'bg-green-600/20 text-green-300'
                                                    : 'bg-gray-500/20 text-gray-300'
                                            )}
                                        >
                                            {isRunning ? 'Running' : 'Not running'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleLaunch(app.path)}
                                            disabled={isLaunching}
                                            className="rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isLaunching ? 'Launching...' : 'Launch'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(app.path)}
                                            className="inline-flex items-center gap-1 rounded-md border border-[var(--ui-border-strong)] px-3 py-2 text-sm text-[var(--ui-text-soft)] transition-colors hover:bg-[var(--ui-surface-hover)]"
                                        >
                                            <Trash2 size={14} />
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {(appsError || actionError) && (
                    <p className="mt-4 text-sm text-red-400">{actionError ?? appsError}</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
