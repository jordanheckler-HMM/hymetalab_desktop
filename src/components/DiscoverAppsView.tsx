import { FormEvent, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { RegisteredApp } from '../utils/tauri';
import { cn } from '../utils/cn';

const DiscoverAppsView = () => {
    const registeredApps = useStore((state) => state.registeredApps);
    const isAppsLoading = useStore((state) => state.isAppsLoading);
    const appsError = useStore((state) => state.appsError);
    const addRegisteredApp = useStore((state) => state.addRegisteredApp);
    const scanInstalledApps = useStore((state) => state.scanInstalledApps);
    const glassmorphism = useStore((state) => state.visualSettings.glassmorphism);
    const microAnimations = useStore((state) => state.visualSettings.microAnimations);
    const iconCache = useStore((state) => state.iconCache);
    const appIconsEnabled = useStore((state) => state.visualSettings.appIcons);

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
                if (normalizedQuery.length === 0) return true;
                return (
                    scanResult.name.toLowerCase().includes(normalizedQuery) ||
                    scanResult.path.toLowerCase().includes(normalizedQuery)
                );
            });
    }, [registeredPathSet, scanResults, searchQuery]);

    const getErrorMessage = (error: unknown) => {
        if (error instanceof Error && error.message) return error.message;
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

    const cardClass = glassmorphism
        ? 'glass-card rounded-xl p-6'
        : 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-solid)] p-6';

    const innerCardClass = glassmorphism
        ? 'glass-light rounded-lg p-3'
        : 'rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3';

    const inputClass = cn(
        'w-full rounded-lg px-3 py-2 text-[var(--ui-text)] transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30',
        glassmorphism
            ? 'bg-white/5 border border-white/10'
            : 'bg-[var(--ui-surface-hover)] border border-[var(--ui-border-strong)]'
    );

    return (
        <div className="relative z-10 flex-1 overflow-auto p-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[var(--ui-text)]">Discover Apps</h1>
                <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                    Search for apps and add them to your launcher.
                </p>
            </div>

            {/* Registered Apps Section */}
            <div className={cn(cardClass, 'mb-6')}>
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">
                    Registered Apps ({registeredApps.length})
                </h2>
                {registeredApps.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">No apps registered yet.</p>
                ) : (
                    <div className="space-y-2">
                        {registeredApps.map((app) => {
                            const iconUrl = appIconsEnabled ? iconCache[app.path] : undefined;
                            return (
                                <div key={app.path} className={cn(innerCardClass, 'flex items-center gap-3')}>
                                    {iconUrl ? (
                                        <img src={iconUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg" draggable={false} />
                                    ) : (
                                        <div className="app-icon-fallback" style={{ width: 32, height: 32, fontSize: 12, borderRadius: 8 }}>
                                            {app.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--ui-text)]">{app.name}</p>
                                        <p className="truncate text-xs text-[var(--ui-text-muted)]">{app.path}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Manual Add Section */}
            <div className={cn(cardClass, 'mb-6')}>
                <h2 className="mb-4 text-xl font-semibold text-[var(--ui-text)]">Add App Manually</h2>
                <form onSubmit={handleManualAdd} className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
                        <input
                            type="text"
                            value={manualPath}
                            onChange={(event) => setManualPath(event.target.value)}
                            placeholder="/Applications/YourApp.app"
                            className={inputClass}
                        />
                        <input
                            type="text"
                            value={manualName}
                            onChange={(event) => setManualName(event.target.value)}
                            placeholder="Custom name (optional)"
                            className={inputClass}
                        />
                        {microAnimations ? (
                            <motion.button
                                type="submit"
                                disabled={isAddingManual}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="btn-gradient inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Plus size={14} />
                                    {isAddingManual ? 'Adding...' : 'Add'}
                                </span>
                            </motion.button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isAddingManual}
                                className="btn-gradient inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Plus size={14} />
                                    {isAddingManual ? 'Adding...' : 'Add'}
                                </span>
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-[var(--ui-text-muted)]">
                        Tip: drag a `.app` from Finder into this field to paste its path.
                    </p>
                </form>
                {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
            </div>

            {/* Scan Section */}
            <div className={cardClass}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-[var(--ui-text)]">
                        Scan Installed Apps
                    </h2>
                    {microAnimations ? (
                        <motion.button
                            type="button"
                            onClick={handleScanInstalledApps}
                            disabled={isScanning || isAppsLoading}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                glassmorphism
                                    ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                                    : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                            )}
                        >
                            <Search size={14} />
                            {isScanning ? 'Scanning...' : 'Scan'}
                        </motion.button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleScanInstalledApps}
                            disabled={isScanning || isAppsLoading}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                glassmorphism
                                    ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                                    : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                            )}
                        >
                            <Search size={14} />
                            {isScanning ? 'Scanning...' : 'Scan'}
                        </button>
                    )}
                </div>

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by app name or path"
                    className={cn(inputClass, 'mb-4')}
                />

                {filteredSuggestions.length === 0 ? (
                    <p className="text-sm text-[var(--ui-text-muted)]">
                        {scanResults.length === 0
                            ? 'Run a scan to find installed apps.'
                            : 'No matching unregistered apps found.'}
                    </p>
                ) : (
                    <AnimatePresence>
                        <div className="space-y-2">
                            {filteredSuggestions.map((app) => {
                                const Wrapper = microAnimations ? motion.div : 'div';
                                const wrapperProps = microAnimations
                                    ? {
                                        initial: { opacity: 0, y: 6 },
                                        animate: { opacity: 1, y: 0 },
                                        exit: { opacity: 0, y: -6 },
                                        transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
                                    }
                                    : {};

                                return (
                                    <Wrapper
                                        key={app.path}
                                        className={cn(
                                            innerCardClass,
                                            'flex flex-wrap items-center justify-between gap-3'
                                        )}
                                        {...wrapperProps}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[var(--ui-text)]">{app.name}</p>
                                            <p className="truncate text-xs text-[var(--ui-text-muted)]">{app.path}</p>
                                        </div>
                                        {microAnimations ? (
                                            <motion.button
                                                type="button"
                                                onClick={() => void handleAddSuggestion(app)}
                                                whileHover={{ scale: 1.06 }}
                                                whileTap={{ scale: 0.94 }}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors',
                                                    glassmorphism
                                                        ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                                                        : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                                                )}
                                            >
                                                <Plus size={14} />
                                                Add
                                            </motion.button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void handleAddSuggestion(app)}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors',
                                                    glassmorphism
                                                        ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                                                        : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                                                )}
                                            >
                                                <Plus size={14} />
                                                Add
                                            </button>
                                        )}
                                    </Wrapper>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}

                {(appsError || actionError) && (
                    <p className="mt-4 text-sm text-red-400">{actionError ?? appsError}</p>
                )}
            </div>
        </div>
    );
};

export default DiscoverAppsView;
