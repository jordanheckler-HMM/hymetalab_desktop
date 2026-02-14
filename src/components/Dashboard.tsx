import { DragEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { GripVertical, Rocket, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useStore } from '../store';

const APP_ORDER_STORAGE_KEY = 'hymetalab_registered_app_order';
const APP_GRID_COLUMNS = 4;

const readStoredAppOrder = (): string[] => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = localStorage.getItem(APP_ORDER_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
    } catch {
        return [];
    }
};

const writeStoredAppOrder = (paths: string[]) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(APP_ORDER_STORAGE_KEY, JSON.stringify(paths));
    } catch {
        // ignore
    }
};

const areOrdersEqual = (left: string[], right: string[]) => {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((value, index) => value === right[index]);
};

const reorderPaths = (paths: string[], sourcePath: string, targetPath: string): string[] => {
    const fromIndex = paths.indexOf(sourcePath);
    const toIndex = paths.indexOf(targetPath);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return paths;
    }

    const reordered = [...paths];
    const [movedPath] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedPath);
    return reordered;
};

const movePathByIndex = (paths: string[], sourcePath: string, targetIndex: number): string[] => {
    const fromIndex = paths.indexOf(sourcePath);
    if (fromIndex === -1) {
        return paths;
    }

    const clampedTargetIndex = Math.max(0, Math.min(paths.length - 1, targetIndex));
    if (fromIndex === clampedTargetIndex) {
        return paths;
    }

    const reordered = [...paths];
    const [movedPath] = reordered.splice(fromIndex, 1);
    reordered.splice(clampedTargetIndex, 0, movedPath);
    return reordered;
};

const Dashboard = () => {
    const registeredApps = useStore((state) => state.registeredApps);
    const iconCache = useStore((state) => state.iconCache);
    const isAppsLoading = useStore((state) => state.isAppsLoading);
    const appsError = useStore((state) => state.appsError);
    const launchExternalApp = useStore((state) => state.launchExternalApp);
    const removeRegisteredApp = useStore((state) => state.removeRegisteredApp);
    const glassmorphism = useStore((state) => state.visualSettings.glassmorphism);
    const microAnimations = useStore((state) => state.visualSettings.microAnimations);
    const appIconsEnabled = useStore((state) => state.visualSettings.appIcons);

    const [launchingPath, setLaunchingPath] = useState<string | null>(null);
    const [removingPath, setRemovingPath] = useState<string | null>(null);
    const [orderedPaths, setOrderedPaths] = useState<string[]>(() => readStoredAppOrder());
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [draggedPath, setDraggedPath] = useState<string | null>(null);
    const [dragOverPath, setDragOverPath] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const getErrorMessage = (error: unknown) => {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        return 'An unknown error occurred.';
    };

    useEffect(() => {
        const registeredPaths = registeredApps.map((app) => app.path);
        const registeredPathSet = new Set(registeredPaths);

        setOrderedPaths((currentOrder) => {
            const nextOrder = currentOrder.filter((path) => registeredPathSet.has(path));

            for (const path of registeredPaths) {
                if (!nextOrder.includes(path)) {
                    nextOrder.push(path);
                }
            }

            if (areOrdersEqual(currentOrder, nextOrder)) {
                return currentOrder;
            }

            writeStoredAppOrder(nextOrder);
            return nextOrder;
        });
    }, [registeredApps]);

    const orderedApps = useMemo(() => {
        const appByPath = new Map(registeredApps.map((app) => [app.path, app]));
        const ordered = orderedPaths
            .map((path) => appByPath.get(path))
            .filter((app): app is (typeof registeredApps)[number] => app !== undefined);

        const seenPaths = new Set(ordered.map((app) => app.path));
        for (const app of registeredApps) {
            if (!seenPaths.has(app.path)) {
                ordered.push(app);
            }
        }

        return ordered;
    }, [orderedPaths, registeredApps]);

    const handleLaunch = async (path: string) => {
        if (isReorderMode) {
            return;
        }

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
        setActionError(null);
        setRemovingPath(path);
        try {
            await removeRegisteredApp(path);
            setOrderedPaths((currentOrder) => {
                const nextOrder = currentOrder.filter((existingPath) => existingPath !== path);
                writeStoredAppOrder(nextOrder);
                return nextOrder;
            });
        } catch (error) {
            setActionError(getErrorMessage(error));
        } finally {
            setRemovingPath(null);
        }
    };

    const handleDragStart = (event: DragEvent<HTMLButtonElement>, path: string) => {
        if (!isReorderMode) {
            return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', path);
        setDraggedPath(path);
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>, targetPath: string) => {
        if (!isReorderMode) {
            return;
        }

        const sourcePath = draggedPath ?? event.dataTransfer.getData('text/plain');
        if (!sourcePath || sourcePath === targetPath) {
            return;
        }

        event.preventDefault();
        if (dragOverPath !== targetPath) {
            setDragOverPath(targetPath);
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>, targetPath: string) => {
        if (!isReorderMode) {
            return;
        }

        event.preventDefault();
        const sourcePath = draggedPath ?? event.dataTransfer.getData('text/plain');
        if (!sourcePath || sourcePath === targetPath) {
            setDraggedPath(null);
            setDragOverPath(null);
            return;
        }

        setOrderedPaths((currentOrder) => {
            const nextOrder = reorderPaths(currentOrder, sourcePath, targetPath);
            if (!areOrdersEqual(currentOrder, nextOrder)) {
                writeStoredAppOrder(nextOrder);
            }
            return nextOrder;
        });

        setDraggedPath(null);
        setDragOverPath(null);
    };

    const handleDragEnd = () => {
        setDraggedPath(null);
        setDragOverPath(null);
    };

    const handleKeyReorder = (event: KeyboardEvent<HTMLButtonElement>, path: string) => {
        if (!isReorderMode) {
            return;
        }

        const isHandledKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key);
        if (!isHandledKey) {
            return;
        }

        event.preventDefault();
        setOrderedPaths((currentOrder) => {
            const currentIndex = currentOrder.indexOf(path);
            if (currentIndex === -1) {
                return currentOrder;
            }

            let targetIndex = currentIndex;
            switch (event.key) {
                case 'ArrowLeft':
                    targetIndex = currentIndex - 1;
                    break;
                case 'ArrowRight':
                    targetIndex = currentIndex + 1;
                    break;
                case 'ArrowUp':
                    targetIndex = currentIndex - APP_GRID_COLUMNS;
                    break;
                case 'ArrowDown':
                    targetIndex = currentIndex + APP_GRID_COLUMNS;
                    break;
                case 'Home':
                    targetIndex = 0;
                    break;
                case 'End':
                    targetIndex = currentOrder.length - 1;
                    break;
                default:
                    break;
            }

            const nextOrder = movePathByIndex(currentOrder, path, targetIndex);
            if (!areOrdersEqual(currentOrder, nextOrder)) {
                writeStoredAppOrder(nextOrder);
            }
            return nextOrder;
        });
    };

    const cardClass = glassmorphism
        ? 'glass-card rounded-xl p-6'
        : 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-solid)] p-6';

    const appCardClass = glassmorphism
        ? 'glass-light rounded-xl p-2'
        : 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-2';

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
                    onClick={() => {
                        setIsReorderMode((value) => !value);
                        setDraggedPath(null);
                        setDragOverPath(null);
                    }}
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors',
                        glassmorphism
                            ? 'glass text-[var(--ui-text-soft)] hover:bg-white/5'
                            : 'border border-[var(--ui-border-strong)] text-[var(--ui-text-soft)] hover:bg-[var(--ui-surface-hover)]'
                    )}
                >
                    <GripVertical size={14} />
                    {isReorderMode ? 'Done' : 'Reorder'}
                </button>
            </div>

            <div className={cardClass}>
                {isReorderMode && (
                    <p className="mb-4 text-xs text-[var(--ui-text-muted)]">
                        Drag app icons or use arrow keys to reorder.
                    </p>
                )}
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
                        className="grid grid-cols-4 gap-3"
                        {...(microAnimations ? { variants: containerVariants, initial: 'hidden', animate: 'show' } : {})}
                    >
                        <AnimatePresence>
                            {orderedApps.map((app) => {
                                const isLaunching = launchingPath === app.path;
                                const isRemoving = removingPath === app.path;
                                const iconUrl = appIconsEnabled ? iconCache[app.path] : undefined;
                                const isDragTarget = dragOverPath === app.path && draggedPath !== app.path;

                                const CardWrapper = microAnimations ? motion.div : 'div';
                                const cardMotionProps = microAnimations
                                    ? {
                                        variants: itemVariants,
                                        layout: true,
                                        exit: { opacity: 0, scale: 0.95 },
                                        ...(isReorderMode
                                            ? {}
                                            : {
                                                whileHover: {
                                                    scale: 1.015,
                                                    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
                                                },
                                            }),
                                    }
                                    : {};

                                return (
                                    <CardWrapper
                                        key={app.path}
                                        className={cn(
                                            appCardClass,
                                            'relative flex h-[74px] items-center justify-center',
                                            isReorderMode && 'cursor-grab',
                                            isDragTarget && 'ring-2 ring-cyan-400/80'
                                        )}
                                        onDragOver={(event) => handleDragOver(event, app.path)}
                                        onDrop={(event) => handleDrop(event, app.path)}
                                        {...cardMotionProps}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => void handleLaunch(app.path)}
                                            disabled={isLaunching}
                                            draggable={isReorderMode && !isLaunching && !isRemoving}
                                            onDragStart={(event) => handleDragStart(event, app.path)}
                                            onDragEnd={handleDragEnd}
                                            onKeyDown={(event) => handleKeyReorder(event, app.path)}
                                            title={isReorderMode ? `Drag to reorder ${app.name}` : `Launch ${app.name}`}
                                            aria-label={
                                                isReorderMode
                                                    ? `Reorder ${app.name}. Use arrow keys to move.`
                                                    : `Launch ${app.name}`
                                            }
                                            className={cn(
                                                'relative inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                                !isReorderMode && 'hover:scale-105 active:scale-95',
                                                glassmorphism
                                                    ? 'glass hover:bg-white/5'
                                                    : 'border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] hover:bg-[var(--ui-surface-solid)]'
                                            )}
                                        >
                                            {iconUrl ? (
                                                <img
                                                    src={iconUrl}
                                                    alt={`${app.name} icon`}
                                                    className="h-10 w-10 shrink-0 rounded-lg"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div
                                                    className="app-icon-fallback"
                                                    style={{ width: 40, height: 40, fontSize: 14, borderRadius: 10 }}
                                                >
                                                    {app.name.charAt(0)}
                                                </div>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => void handleRemove(app.path)}
                                            disabled={isRemoving}
                                            title={`Remove ${app.name}`}
                                            className={cn(
                                                'absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--ui-text)] transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                                glassmorphism
                                                    ? 'glass border border-white/20 hover:bg-red-500/20'
                                                    : 'border border-[var(--ui-border-strong)] bg-[var(--ui-surface-solid)] hover:bg-red-500/20'
                                            )}
                                        >
                                            <X size={12} />
                                        </button>
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
