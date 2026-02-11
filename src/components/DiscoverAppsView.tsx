import { FormEvent, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useStore } from '../store';
import { RegisteredApp } from '../utils/tauri';

const DiscoverAppsView = () => {
    const registeredApps = useStore((state) => state.registeredApps);
    const isAppsLoading = useStore((state) => state.isAppsLoading);
    const appsError = useStore((state) => state.appsError);
    const addRegisteredApp = useStore((state) => state.addRegisteredApp);
    const scanInstalledApps = useStore((state) => state.scanInstalledApps);

    const [manualPath, setManualPath] = useState('');
    const [manualName, setManualName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<RegisteredApp[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const registeredPathSet = useMemo(
        () => new Set(registeredApps.map((app) => app.path.toLowerCase())),
        [registeredApps]
    );

    const filteredSuggestions = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return scanResults
            .filter((scanResult) => !registeredPathSet.has(scanResult.path.toLowerCase()))
            .filter((scanResult) => {
                if (normalizedQuery.length === 0) {
                    return true;
                }
                return (
                    scanResult.name.toLowerCase().includes(normalizedQuery) ||
                    scanResult.path.toLowerCase().includes(normalizedQuery)
                );
            });
    }, [registeredPathSet, scanResults, searchQuery]);

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
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[var(--ui-text)]">Discover Apps</h1>
                <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                    Search for apps and add them to your launcher.
                </p>
            </div>

            <div className="mb-6 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">
                    Registered Apps ({registeredApps.length})
                </h2>
                {registeredApps.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">No apps registered yet.</p>
                ) : (
                    <div className="space-y-2">
                        {registeredApps.map((app) => (
                            <div
                                key={app.path}
                                className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3"
                            >
                                <p className="text-sm font-semibold text-[var(--ui-text)]">{app.name}</p>
                                <p className="break-all text-xs text-[var(--ui-text-muted)]">
                                    {app.path}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-6 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">Add App Manually</h2>
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
                        Tip: drag a `.app` from Finder into this field to paste its path.
                    </p>
                </form>
                {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
            </div>

            <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-[var(--ui-text)]">
                        Scan and Search Installed Apps
                    </h2>
                    <button
                        type="button"
                        onClick={handleScanInstalledApps}
                        disabled={isScanning || isAppsLoading}
                        className="inline-flex items-center gap-2 rounded-md border border-[var(--ui-border-strong)] px-3 py-2 text-sm text-[var(--ui-text-soft)] transition-colors hover:bg-[var(--ui-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Search size={14} />
                        {isScanning ? 'Scanning...' : 'Scan'}
                    </button>
                </div>

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by app name or path"
                    className="mb-4 w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] px-3 py-2 text-[var(--ui-text)] focus:border-cyan-500 focus:outline-none"
                />

                {filteredSuggestions.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">
                        {scanResults.length === 0
                            ? 'Run a scan to find installed apps.'
                            : 'No matching unregistered apps found.'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {filteredSuggestions.map((app) => (
                            <div
                                key={app.path}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--ui-text)]">{app.name}</p>
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

export default DiscoverAppsView;
