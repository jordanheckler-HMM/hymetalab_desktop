import { create } from 'zustand';
import {
    addRegisteredApp as addRegisteredAppApi,
    AppConfig,
    getAppIcon,
    getRegisteredApps,
    getRunningRegisteredApps,
    launchRegisteredApp,
    loadConfig,
    RegisteredApp,
    removeRegisteredApp as removeRegisteredAppApi,
    saveConfig,
    scanInstalledApps as scanInstalledAppsApi,
} from '../utils/tauri';

export type RunningAppsMap = Record<string, boolean>;
export type IconCacheMap = Record<string, string>;

export interface VisualSettings {
    glassmorphism: boolean;
    dynamicBackground: boolean;
    microAnimations: boolean;
    appIcons: boolean;
}

const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
    glassmorphism: true,
    dynamicBackground: true,
    microAnimations: true,
    appIcons: true,
};

const VISUAL_SETTINGS_KEY = 'hymetalab_visual_settings';

function loadVisualSettings(): VisualSettings {
    try {
        const raw = localStorage.getItem(VISUAL_SETTINGS_KEY);
        if (raw) {
            return { ...DEFAULT_VISUAL_SETTINGS, ...JSON.parse(raw) };
        }
    } catch {
        // ignore
    }
    return DEFAULT_VISUAL_SETTINGS;
}

function persistVisualSettings(settings: VisualSettings) {
    try {
        localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
}

const errorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return 'An unknown error occurred.';
};

interface AppState {
    currentPage: 'dashboard' | 'discover' | 'settings';
    config: AppConfig;
    isLoading: boolean;
    isAppsLoading: boolean;
    appsError: string | null;
    registeredApps: RegisteredApp[];
    runningApps: RunningAppsMap;
    iconCache: IconCacheMap;
    sidebarCollapsed: boolean;
    mobileNavOpen: boolean;
    visualSettings: VisualSettings;
    setPage: (page: AppState['currentPage']) => void;
    toggleSidebar: () => void;
    setMobileNavOpen: (isOpen: boolean) => void;
    updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
    loadInitialConfig: () => Promise<void>;
    loadRegisteredApps: () => Promise<void>;
    refreshRunningApps: () => Promise<void>;
    addRegisteredApp: (path: string, name?: string) => Promise<void>;
    removeRegisteredApp: (path: string) => Promise<void>;
    scanInstalledApps: () => Promise<RegisteredApp[]>;
    launchExternalApp: (path: string) => Promise<void>;
    fetchAppIcon: (path: string) => Promise<void>;
    fetchAllIcons: (apps: RegisteredApp[]) => Promise<void>;
    updateVisualSettings: (settings: Partial<VisualSettings>) => void;
}

export const useStore = create<AppState>((set, get) => ({
    currentPage: 'dashboard',
    config: {
        userName: 'User',
        aiMode: 'local',
        theme: 'dark',
    },
    isLoading: true,
    isAppsLoading: false,
    appsError: null,
    registeredApps: [],
    runningApps: {},
    iconCache: {},
    sidebarCollapsed: true,
    mobileNavOpen: false,
    visualSettings: loadVisualSettings(),
    setPage: (page) =>
        set({
            currentPage: page,
            mobileNavOpen: false,
        }),
    toggleSidebar: () =>
        set((state) => ({
            sidebarCollapsed: !state.sidebarCollapsed,
        })),
    setMobileNavOpen: (isOpen) =>
        set({
            mobileNavOpen: isOpen,
        }),
    updateConfig: async (newConfig) => {
        const updatedConfig = { ...get().config, ...newConfig };
        set({ config: updatedConfig });
        await saveConfig(updatedConfig);
    },
    loadInitialConfig: async () => {
        const loaded = await loadConfig();
        if (loaded) {
            set({ config: loaded, isLoading: false });
        } else {
            set({ isLoading: false });
        }
    },
    loadRegisteredApps: async () => {
        set({ isAppsLoading: true, appsError: null });
        try {
            const registeredApps = await getRegisteredApps();
            set({ registeredApps });
            await get().refreshRunningApps();
            if (get().visualSettings.appIcons) {
                void get().fetchAllIcons(registeredApps);
            }
        } catch (error) {
            set({ appsError: errorMessage(error) });
        } finally {
            set({ isAppsLoading: false });
        }
    },
    refreshRunningApps: async () => {
        try {
            const appPaths = get().registeredApps.map((app) => app.path);
            if (appPaths.length === 0) {
                set({ runningApps: {} });
                return;
            }

            const statuses = await getRunningRegisteredApps(appPaths);
            const runningApps = statuses.reduce<RunningAppsMap>((map, status) => {
                map[status.path] = status.running;
                return map;
            }, {});

            set({ runningApps, appsError: null });
        } catch (error) {
            set({ appsError: errorMessage(error) });
        }
    },
    addRegisteredApp: async (path, name) => {
        const registeredApps = await addRegisteredAppApi(path, name);
        set({ registeredApps, appsError: null });
        await get().refreshRunningApps();
        if (get().visualSettings.appIcons) {
            void get().fetchAppIcon(path);
        }
    },
    removeRegisteredApp: async (path) => {
        const registeredApps = await removeRegisteredAppApi(path);
        set({ registeredApps, appsError: null });
        await get().refreshRunningApps();
    },
    scanInstalledApps: async () => {
        return scanInstalledAppsApi();
    },
    launchExternalApp: async (path) => {
        await launchRegisteredApp(path);
        set((state) => ({
            runningApps: {
                ...state.runningApps,
                [path]: true,
            },
        }));
    },
    fetchAppIcon: async (path) => {
        if (get().iconCache[path]) return;
        try {
            const dataUrl = await getAppIcon(path);
            set((state) => ({
                iconCache: { ...state.iconCache, [path]: dataUrl },
            }));
        } catch {
            // Silently fail — fallback icon will show
        }
    },
    fetchAllIcons: async (apps) => {
        const cache = get().iconCache;
        const uncached = apps.filter((app) => !cache[app.path]);
        await Promise.allSettled(uncached.map((app) => get().fetchAppIcon(app.path)));
    },
    updateVisualSettings: (partial) => {
        const updated = { ...get().visualSettings, ...partial };
        set({ visualSettings: updated });
        persistVisualSettings(updated);
    },
}));
