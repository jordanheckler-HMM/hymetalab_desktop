# HYMetaLab Desktop

A Tauri v2 desktop application that serves as a launcher and dashboard for the HYMetaLab ecosystem of apps.

## Overview

HYMetaLab Desktop is a centralized hub for managing and launching three specialized desktop applications:
- **Companion** (LUMORA archetype) - Personal AI Companion
- **Dugout** (LYRA archetype) - Baseball Coaching Tool
- **HMM** (VESTA archetype) - Business CRM

## Features

- **Dashboard View**: Quick access to launch all ecosystem apps with visual cards
- **Ecosystem Health Monitoring**: Real-time coherence metrics for personal, team, and business aspects
- **Settings Management**: Configure user preferences, AI mode, and theme
- **Dark Theme**: Modern, sleek dark interface (#0f0f0f background)
- **Persistent Configuration**: Settings stored in `~/.hymetalab/config/global.json`

## Tech Stack

- **Tauri v2**: Desktop application framework
- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS 3**: Utility-first styling
- **Zustand**: State management
- **Lucide React**: Icon library

## Development

### Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable)
- npm or yarn

### Installation

```bash
npm install
```

### Running in Development Mode

```bash
npm run tauri dev
```

This will:
1. Start the Vite development server on `http://localhost:1420`
2. Compile the Rust backend
3. Launch the desktop application window (1200x800)

### Building for Production

```bash
npm run tauri build
```

## Project Structure

```
hymetalab_desktop/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── Dashboard.tsx        # Main dashboard view
│   │   ├── SettingsView.tsx     # Settings configuration
│   │   └── PlaceholderView.tsx  # Placeholder for app views
│   ├── store/
│   │   └── index.ts             # Zustand state management
│   ├── utils/
│   │   └── tauri.ts             # Tauri API utilities
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                 # React entry point
│   └── index.css                # Global styles
├── src-tauri/
│   ├── src/
│   │   └── lib.rs               # Rust backend
│   ├── capabilities/
│   │   └── default.json         # Tauri permissions
│   └── tauri.conf.json          # Tauri configuration
└── package.json
```

## Configuration

Settings are stored in `~/.hymetalab/config/global.json` with the following structure:

```json
{
  "userName": "User",
  "aiMode": "local",
  "theme": "dark"
}
```

## Navigation

The sidebar provides access to:
- **Home** (Dashboard) - Main view with app launchers
- **Companion** - Placeholder view
- **Dugout** - Placeholder view
- **HMM** - Placeholder view
- **Settings** - Configuration panel

## Permissions

The app has the following Tauri permissions:
- `fs:default` - File system access
- `fs:allow-read-text-file` - Read text files
- `fs:allow-write-text-file` - Write text files
- `fs:allow-exists` - Check file existence
- `fs:allow-mkdir` - Create directories
- `shell:default` - Shell access
- `shell:allow-open` - Open external applications

## Future Enhancements

- Implement actual app launching logic with proper paths
- Add real-time ecosystem health data integration
- Implement light theme support
- Add more detailed app views for Companion, Dugout, and HMM
- Integrate with shared data layer (Layer 0)

## License

Proprietary - HYMetaLab
