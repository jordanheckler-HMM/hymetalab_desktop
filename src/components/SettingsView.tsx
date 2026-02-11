import { useEffect, useState } from 'react';
import { useStore } from '../store';

const SettingsView = () => {
    const config = useStore((state) => state.config);
    const updateConfig = useStore((state) => state.updateConfig);
    const [localConfig, setLocalConfig] = useState(config);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateConfig(localConfig);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 overflow-auto p-8">
            <h1 className="mb-8 text-4xl font-bold text-[var(--ui-text)]">Settings</h1>

            <div className="max-w-2xl rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-6">
                <div className="space-y-6">
                    {/* User Name */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--ui-text-soft)]">
                            User Name
                        </label>
                        <input
                            type="text"
                            value={localConfig.userName}
                            onChange={(e) =>
                                setLocalConfig({ ...localConfig, userName: e.target.value })
                            }
                            className="w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] px-4 py-2 text-[var(--ui-text)] transition-colors focus:border-cyan-500 focus:outline-none"
                            placeholder="Enter your name"
                        />
                    </div>

                    {/* AI Mode */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--ui-text-soft)]">
                            AI Mode
                        </label>
                        <select
                            value={localConfig.aiMode}
                            onChange={(e) =>
                                setLocalConfig({
                                    ...localConfig,
                                    aiMode: e.target.value as 'local' | 'cloud',
                                })
                            }
                            className="w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] px-4 py-2 text-[var(--ui-text)] transition-colors focus:border-cyan-500 focus:outline-none"
                        >
                            <option value="local">Local (Ollama)</option>
                            <option value="cloud">Cloud</option>
                        </select>
                    </div>

                    {/* Theme */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-[var(--ui-text-soft)]">
                            Theme
                        </label>
                        <select
                            value={localConfig.theme}
                            onChange={(e) =>
                                setLocalConfig({
                                    ...localConfig,
                                    theme: e.target.value as 'dark' | 'light',
                                })
                            }
                            className="w-full rounded-lg border border-[var(--ui-border-strong)] bg-[var(--ui-surface-hover)] px-4 py-2 text-[var(--ui-text)] transition-colors focus:border-cyan-500 focus:outline-none"
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>

                    {/* Save Button */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:opacity-90 transition-opacity duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
