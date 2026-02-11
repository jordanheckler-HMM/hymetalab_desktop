import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Layers, Wand2, AppWindow, Save, type LucideIcon } from 'lucide-react';
import { useStore, VisualSettings } from '../store';
import { cn } from '../utils/cn';

interface ToggleSwitchProps {
    enabled: boolean;
    onChange: (value: boolean) => void;
}

const ToggleSwitch = ({ enabled, onChange }: ToggleSwitchProps) => (
    <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn('toggle-track', enabled && 'toggle-track--active')}
    >
        <span className="toggle-thumb" />
    </button>
);

interface VisualToggleRowProps {
    icon: LucideIcon;
    title: string;
    description: string;
    enabled: boolean;
    onChange: (value: boolean) => void;
    microAnimations: boolean;
    glassmorphism: boolean;
}

const VisualToggleRow = ({
    icon: Icon,
    title,
    description,
    enabled,
    onChange,
    microAnimations,
    glassmorphism,
}: VisualToggleRowProps) => {
    const Wrapper = microAnimations ? motion.div : 'div';
    const wrapperProps = microAnimations
        ? { whileHover: { scale: 1.01 }, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }
        : {};

    return (
        <Wrapper
            className={cn(
                'flex items-center justify-between gap-4 rounded-lg p-4',
                glassmorphism ? 'glass-light' : 'border border-[var(--ui-border)] bg-[var(--ui-bg)]'
            )}
            {...wrapperProps}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                    <Icon size={20} className="text-cyan-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-[var(--ui-text)]">{title}</p>
                    <p className="text-xs text-[var(--ui-text-muted)]">{description}</p>
                </div>
            </div>
            <ToggleSwitch enabled={enabled} onChange={onChange} />
        </Wrapper>
    );
};

const SettingsView = () => {
    const config = useStore((state) => state.config);
    const updateConfig = useStore((state) => state.updateConfig);
    const visualSettings = useStore((state) => state.visualSettings);
    const updateVisualSettings = useStore((state) => state.updateVisualSettings);
    const glassmorphism = useStore((state) => state.visualSettings.glassmorphism);
    const microAnimations = useStore((state) => state.visualSettings.microAnimations);

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

    const handleVisualToggle = (key: keyof VisualSettings) => (value: boolean) => {
        updateVisualSettings({ [key]: value });
    };

    const cardClass = glassmorphism
        ? 'glass-card rounded-xl p-6'
        : 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-solid)] p-6';

    const inputClass = cn(
        'w-full rounded-lg px-4 py-2 text-[var(--ui-text)] transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30',
        glassmorphism
            ? 'bg-white/5 border border-white/10'
            : 'bg-[var(--ui-surface-hover)] border border-[var(--ui-border-strong)]'
    );

    const selectClass = cn(
        'w-full rounded-lg px-4 py-2 text-[var(--ui-text)] transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30',
        glassmorphism
            ? 'bg-white/5 border border-white/10'
            : 'bg-[var(--ui-surface-hover)] border border-[var(--ui-border-strong)]'
    );

    return (
        <div className="relative z-10 flex-1 overflow-auto p-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-[var(--ui-text)]">Settings</h1>
                <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
                    Customize your launcher experience.
                </p>
            </div>

            <div className="max-w-2xl space-y-6">
                {/* ─── Visual Effects ─── */}
                <div className={cardClass}>
                    <div className="mb-5 flex items-center gap-2">
                        <Sparkles size={20} className="text-cyan-400" />
                        <h2 className="text-xl font-semibold text-[var(--ui-text)]">Visual Effects</h2>
                    </div>
                    <p className="mb-4 text-xs text-[var(--ui-text-muted)]">
                        Toggle premium visual features. Changes apply instantly.
                    </p>

                    <div className="space-y-3">
                        <VisualToggleRow
                            icon={Layers}
                            title="Glassmorphism"
                            description="Frosted glass effect on sidebar and cards with backdrop blur"
                            enabled={visualSettings.glassmorphism}
                            onChange={handleVisualToggle('glassmorphism')}
                            microAnimations={microAnimations}
                            glassmorphism={glassmorphism}
                        />
                        <VisualToggleRow
                            icon={Sparkles}
                            title="Dynamic Background"
                            description="Animated mesh gradient that responds to mouse movement"
                            enabled={visualSettings.dynamicBackground}
                            onChange={handleVisualToggle('dynamicBackground')}
                            microAnimations={microAnimations}
                            glassmorphism={glassmorphism}
                        />
                        <VisualToggleRow
                            icon={Wand2}
                            title="Micro-Animations"
                            description="Spring physics on buttons, cards, and page transitions"
                            enabled={visualSettings.microAnimations}
                            onChange={handleVisualToggle('microAnimations')}
                            microAnimations={microAnimations}
                            glassmorphism={glassmorphism}
                        />
                        <VisualToggleRow
                            icon={AppWindow}
                            title="App Icons"
                            description="Extract and display real app icons from .app bundles"
                            enabled={visualSettings.appIcons}
                            onChange={handleVisualToggle('appIcons')}
                            microAnimations={microAnimations}
                            glassmorphism={glassmorphism}
                        />
                    </div>
                </div>

                {/* ─── General Settings ─── */}
                <div className={cardClass}>
                    <h2 className="mb-5 text-xl font-semibold text-[var(--ui-text)]">General</h2>

                    <div className="space-y-5">
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
                                className={inputClass}
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
                                className={selectClass}
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
                                className={selectClass}
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                        </div>

                        {/* Save Button */}
                        {microAnimations ? (
                            <motion.button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg py-3 px-4 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="flex items-center gap-2">
                                    <Save size={16} />
                                    {isSaving ? 'Saving...' : 'Save General Settings'}
                                </span>
                            </motion.button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg py-3 px-4 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="flex items-center gap-2">
                                    <Save size={16} />
                                    {isSaving ? 'Saving...' : 'Save General Settings'}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
