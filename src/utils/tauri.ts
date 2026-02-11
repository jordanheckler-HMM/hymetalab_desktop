import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

export interface AppConfig {
    userName: string;
    aiMode: 'local' | 'cloud';
    theme: 'dark' | 'light';
}

export interface RegisteredApp {
    name: string;
    path: string;
}

export interface RunningRegisteredApp {
    path: string;
    running: boolean;
}

export const getRegisteredApps = async (): Promise<RegisteredApp[]> => {
    return invoke<RegisteredApp[]>('get_registered_apps');
};

export const addRegisteredApp = async (
    path: string,
    name?: string,
): Promise<RegisteredApp[]> => {
    return invoke<RegisteredApp[]>('add_registered_app', { path, name: name ?? null });
};

export const removeRegisteredApp = async (path: string): Promise<RegisteredApp[]> => {
    return invoke<RegisteredApp[]>('remove_registered_app', { path });
};

export const scanInstalledApps = async (): Promise<RegisteredApp[]> => {
    return invoke<RegisteredApp[]>('scan_installed_apps');
};

export const launchRegisteredApp = async (path: string): Promise<void> => {
    await invoke('launch_registered_app', { path });
};

export const getRunningRegisteredApps = async (
    paths: string[],
): Promise<RunningRegisteredApp[]> => {
    return invoke<RunningRegisteredApp[]>('get_running_registered_apps', { paths });
};

export interface CciSignal {
    value: number;
    timestamp: string;
    label: string;
}

export interface CciSignalsResponse {
    companion: CciSignal | null;
    dugout: CciSignal | null;
    hmm: CciSignal | null;
}

export const readCciSignals = async (): Promise<CciSignalsResponse> => {
    return invoke<CciSignalsResponse>('read_cci_signals');
};

const CONFIG_DIR = '.hymetalab/config';
const CONFIG_FILE = 'global.json';

export const loadConfig = async (): Promise<AppConfig | null> => {
    try {
        const configPath = `${CONFIG_DIR}/${CONFIG_FILE}`;
        const doesExist = await exists(configPath, { baseDir: BaseDirectory.Home });

        if (doesExist) {
            const contents = await readTextFile(configPath, { baseDir: BaseDirectory.Home });
            return JSON.parse(contents) as AppConfig;
        }
        return null;
    } catch (error) {
        console.error('Failed to load config:', error);
        return null;
    }
};

export const saveConfig = async (config: AppConfig) => {
    try {
        const configPath = `${CONFIG_DIR}/${CONFIG_FILE}`;
        const dirExists = await exists(CONFIG_DIR, { baseDir: BaseDirectory.Home });

        if (!dirExists) {
            await mkdir(CONFIG_DIR, { baseDir: BaseDirectory.Home, recursive: true });
        }

        await writeTextFile(configPath, JSON.stringify(config, null, 2), { baseDir: BaseDirectory.Home });
    } catch (error) {
        console.error('Failed to save config:', error);
    }
};
