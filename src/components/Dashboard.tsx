import { FormEvent, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useStore } from '../store';
import { RegisteredApp } from '../utils/tauri';

const Dashboard = () => {
    const registeredApps = useStore((state) => state.registeredApps);
    const runningApps = useStore((state) => state.runningApps);
    const isAppsLoading = useStore((state) => state.isAppsLoading);
    const appsError = useStore((state) => state.appsError);
    const launchExternalApp = useStore((state) => state.launchExternalApp);
    const addRegisteredApp = useStore((state) => state.addRegisteredApp);
    const removeRegisteredApp = useStore((state) => state.removeRegisteredApp);
    const refreshRunningApps = useStore((state) => state.refreshRunningApps);
    const scanInstalledApps = useStore((state) => state.scanInstalledApps);

    const [manualPath, setManualPath] = useState('');
    const [manualName, setManualName] = useState('');
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<RegisteredApp[]>([]);
    const [launchingPath, setLaunchingPath] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const registeredPathSet = useMemo(
        () => new Set(registeredApps.map((app) => app.path.toLowerCase())),
        [registeredApps]
    );
    const suggestedApps = useMemo(
        () =>
            scanResults.filter(
                (scanResult) => !registeredPathSet.has(scanResult.path.toLowerCase())
            ),
        [registeredPathSet, scanResults]
    );

    const getErrorMessage = (error: unknown) => {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        return 'An unknown error occurred.';
    };

    const handleManualAdd = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setActionError(null);

        const path = manualPath.trim();
        const name = manualName.trim();

        if (path.length === 0) {
            setFormError('App path is required.');
            return;
        }

        if (!path.toLowerCase().endsWith('.app')) {
            setFormError('App path must end with .app');
            return;
        }

        setFormError(null);
        setIsAddingManual(true);

        try {
            await addRegisteredApp(path, name.length > 0 ? name : undefined);
            setManualPath('');
            setManualName('');
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setIsAddingManual(false);
        }
    };

    const handleScanInstalledApps = async () => {
        setActionError(null);
        setIsScanning(true);

        try {
            const discoveredApps = await scanInstalledApps();
            setScanResults(discoveredApps);
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setIsScanning(false);
        }
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

    const handleAddSuggestion = async (app: RegisteredApp) => {
        setActionError(null);
        try {
            await addRegisteredApp(app.path, app.name);
        } catch (error) {
            setActionError(getErrorMessage(error));
        }
    };

    return (
        <div className="flex-1 overflow-auto p-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-[var(--ui-text)]">HYMetaLab App Hub</h1>
                    <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                        Register your apps once, then launch and monitor running status from one
                        place.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleRefreshStatuses}
                        disabled={isRefreshing || isAppsLoading}
                        className="inline-flex items-center gap-2 rounded-md border border-[var(--ui-border-strong)] px-3 py-2 text-sm text-[var(--ui-text-soft)] transition-colors hover:bg-[var(--ui-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={14} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh status'}
                    </button>
                    <button
                        type="button"
                        onClick={handleScanInstalledApps}
                        disabled={isScanning || isAppsLoading}
                        className="inline-flex items-center gap-2 rounded-md border border-[var(--ui-border-strong)] px-3 py-2 text-sm text-[var(--ui-text-soft)] transition-colors hover:bg-[var(--ui-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Search size={14} />
                        {isScanning ? 'Scanning...' : 'Scan installed apps'}
                    </button>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">Add App</h2>
                <form onSubmit={handleManualAdd} className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                        <input
                            type="text"
                            value={manualPath}
                            onChange={(event) => setManualPath(event.target.value)}
                            placeholder="/Applications/YourApp.app"
                            className="w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] px-3 py-2 text-[var(--ui-text)] focus:border-cyan-500 focus:outline-none"
                        />
                        <input
                            type="text"
                            value={manualName}
                            onChange={(event) => setManualName(event.target.value)}
                            placeholder="Custom name (optional)"
                            className="w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] px-3 py-2 text-[var(--ui-text)] focus:border-cyan-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={isAddingManual}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus size={14} />
                            {isAddingManual ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                    <p className="text-xs text-[var(--ui-text-muted)]">
                        Tip: you can drag a `.app` from Finder into this field to paste its path.
                    </p>
                </form>
                {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
            </div>

            <div className="mb-6 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">
                    Registered Apps ({registeredApps.length})
                </h2>

                {isAppsLoading ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">Loading apps...</p>
                ) : registeredApps.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">
                        No apps registered yet. Add one manually or scan installed apps.
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
            </div>

            <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">Scan Suggestions</h2>
                {suggestedApps.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">
                        {scanResults.length === 0
                            ? 'Run "Scan installed apps" to find launchable .app bundles.'
                            : 'No new apps found. Everything scanned is already registered.'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {suggestedApps.map((app) => (
                            <div
                                key={app.path}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--ui-text)]">
                                        {app.name}
                                    </p>
                                    <p className="break-all text-xs text-[var(--ui-text-muted)]">
                                        {app.path}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleAddSuggestion(app)}
                                    className="inline-flex items-center gap-1 rounded-md border border-[var(--ui-border-strong)] px-3 py-2 text-sm text-[var(--ui-text-soft)] transition-colors hover:bg-[var(--ui-surface-hover)]"
                                >
                                    <Plus size={14} />
                                    Add
                                </button>
                            </div>
                        ))}
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
