use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri_plugin_autostart::ManagerExt;
#[cfg(target_os = "macos")]
use tauri_plugin_autostart::MacosLauncher;

const CONFIG_DIR_RELATIVE: &str = ".hymetalab/config";
const APPS_FILE_NAME: &str = "apps.json";
const TRAY_MENU_ID_OPEN_LAUNCHER: &str = "open_launcher";
const TRAY_MENU_ID_QUIT: &str = "quit_launcher";

#[tauri::command]
fn launch_app(app_name: String) -> Result<(), String> {
    let mapped_name = match app_name.as_str() {
        "companion" => "Companion",
        "dugout" => "Dugout",
        "hmm" => "HM Admin Console",
        _ => return Err(format!("Unsupported app name: {app_name}")),
    };

    let output = Command::new("open")
        .arg("-a")
        .arg(mapped_name)
        .output()
        .map_err(|error| format!("Failed to execute open command: {error}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err(format!(
                "Failed to launch {mapped_name}. Expected app at /Applications/{mapped_name}.app"
            ))
        } else {
            Err(format!("Failed to launch {mapped_name}: {stderr}"))
        }
    }
}

#[derive(Serialize)]
struct CciSignal {
    value: f64,
    timestamp: String,
    label: String,
}

#[derive(Serialize)]
struct CciSignalsResponse {
    companion: Option<CciSignal>,
    dugout: Option<CciSignal>,
    hmm: Option<CciSignal>,
}

#[derive(Serialize)]
struct RunningAppsResponse {
    companion: bool,
    dugout: bool,
    hmm: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct RegisteredApp {
    name: String,
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RunningRegisteredApp {
    path: String,
    running: bool,
}

fn read_last_signal_line(file_path: &Path) -> Option<String> {
    if !file_path.exists() {
        return None;
    }

    let file = File::open(file_path).ok()?;
    let reader = BufReader::new(file);
    let mut last_line: Option<String> = None;

    for line_result in reader.lines() {
        let line = line_result.ok()?;
        if !line.trim().is_empty() {
            last_line = Some(line);
        }
    }

    last_line
}

fn parse_signal_from_line(line: &str) -> Option<CciSignal> {
    let parsed: Value = serde_json::from_str(line).ok()?;

    let value = parsed.get("value")?.as_f64()?;
    let timestamp = parsed.get("timestamp")?.as_str()?.to_string();
    let label = parsed.get("label")?.as_str()?.to_string();

    Some(CciSignal {
        value,
        timestamp,
        label,
    })
}

fn read_signal_file(file_path: &Path) -> Option<CciSignal> {
    let last_line = read_last_signal_line(file_path)?;
    parse_signal_from_line(&last_line)
}

fn bundle_name_from_app_path(path: &str) -> Option<String> {
    Path::new(path)
        .file_stem()
        .and_then(|value| value.to_str())
        .map(std::borrow::ToOwned::to_owned)
}

fn is_launchable_app_process_line(command_line: &str, bundle_name: &str) -> bool {
    let normalized_line = command_line.trim().to_ascii_lowercase();
    if normalized_line.is_empty() {
        return false;
    }

    let bundle_segment = format!("/{bundle_name}.app/contents/macos/");
    if !normalized_line.contains(&bundle_segment.to_ascii_lowercase()) {
        return false;
    }

    !normalized_line.contains("/backend-sidecar")
}

fn is_app_running_in_commands(bundle_name: &str, commands: &str) -> bool {
    commands
        .lines()
        .any(|line| is_launchable_app_process_line(line, bundle_name))
}

fn read_process_commands_snapshot() -> String {
    Command::new("ps")
        .args(["-axo", "command"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).into_owned())
        .unwrap_or_default()
}

fn apps_registry_path() -> Result<PathBuf, String> {
    let home_dir =
        env::var("HOME").map_err(|error| format!("Could not resolve HOME: {error}"))?;
    Ok(Path::new(&home_dir)
        .join(CONFIG_DIR_RELATIVE)
        .join(APPS_FILE_NAME))
}

fn is_valid_app_bundle_path(path: &Path) -> bool {
    let has_app_extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.eq_ignore_ascii_case("app"))
        .unwrap_or(false);

    has_app_extension && path.exists() && path.is_dir()
}

fn normalize_app_path(path: &str) -> Result<String, String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("App path is required.".to_string());
    }

    let as_path = Path::new(trimmed_path);
    if !is_valid_app_bundle_path(as_path) {
        return Err(format!(
            "Invalid app bundle path: {trimmed_path}. Expected an existing .app directory."
        ));
    }

    let canonical = fs::canonicalize(as_path).unwrap_or_else(|_| as_path.to_path_buf());
    canonical
        .to_str()
        .map(std::borrow::ToOwned::to_owned)
        .ok_or_else(|| "App path must be valid UTF-8.".to_string())
}

fn sort_and_dedupe_apps(apps: Vec<RegisteredApp>) -> Vec<RegisteredApp> {
    let mut deduped: Vec<RegisteredApp> = Vec::new();

    for app in apps {
        if let Some(existing) = deduped
            .iter_mut()
            .find(|existing| existing.path.eq_ignore_ascii_case(&app.path))
        {
            *existing = app;
        } else {
            deduped.push(app);
        }
    }

    deduped.sort_by(|left, right| {
        left.name
            .to_ascii_lowercase()
            .cmp(&right.name.to_ascii_lowercase())
            .then_with(|| left.path.to_ascii_lowercase().cmp(&right.path.to_ascii_lowercase()))
    });

    deduped
}

fn read_registered_apps() -> Result<Vec<RegisteredApp>, String> {
    let registry_path = apps_registry_path()?;
    if !registry_path.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(&registry_path)
        .map_err(|error| format!("Failed to read app registry: {error}"))?;

    let apps = serde_json::from_str::<Vec<RegisteredApp>>(&contents)
        .map_err(|error| format!("Failed to parse app registry: {error}"))?;

    Ok(sort_and_dedupe_apps(apps))
}

fn write_registered_apps(apps: &[RegisteredApp]) -> Result<(), String> {
    let registry_path = apps_registry_path()?;
    if let Some(parent_dir) = registry_path.parent() {
        fs::create_dir_all(parent_dir)
            .map_err(|error| format!("Failed to create app registry directory: {error}"))?;
    }

    let payload = serde_json::to_string_pretty(apps)
        .map_err(|error| format!("Failed to serialize app registry: {error}"))?;

    fs::write(&registry_path, payload)
        .map_err(|error| format!("Failed to write app registry: {error}"))
}

fn collect_apps_from_directory(directory: &Path, apps: &mut Vec<RegisteredApp>) {
    if !directory.exists() {
        return;
    }

    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };

    for entry in entries.flatten() {
        let candidate_path = entry.path();
        if !is_valid_app_bundle_path(&candidate_path) {
            continue;
        }

        let canonical_path = fs::canonicalize(&candidate_path).unwrap_or(candidate_path);
        let Some(path_string) = canonical_path.to_str().map(std::borrow::ToOwned::to_owned) else {
            continue;
        };

        let Some(bundle_name) = bundle_name_from_app_path(&path_string) else {
            continue;
        };

        apps.push(RegisteredApp {
            name: bundle_name,
            path: path_string,
        });
    }
}

#[tauri::command]
fn get_registered_apps() -> Result<Vec<RegisteredApp>, String> {
    read_registered_apps()
}

#[tauri::command]
fn add_registered_app(path: String, name: Option<String>) -> Result<Vec<RegisteredApp>, String> {
    let normalized_path = normalize_app_path(&path)?;
    let fallback_name = bundle_name_from_app_path(&normalized_path)
        .ok_or_else(|| "Failed to derive app name from path.".to_string())?;
    let normalized_name = name
        .unwrap_or(fallback_name)
        .trim()
        .to_string();

    if normalized_name.is_empty() {
        return Err("App name cannot be empty.".to_string());
    }

    let mut apps = read_registered_apps()?;
    let new_app = RegisteredApp {
        name: normalized_name,
        path: normalized_path,
    };

    if let Some(existing) = apps
        .iter_mut()
        .find(|existing| existing.path.eq_ignore_ascii_case(&new_app.path))
    {
        *existing = new_app;
    } else {
        apps.push(new_app);
    }

    let sorted_apps = sort_and_dedupe_apps(apps);
    write_registered_apps(&sorted_apps)?;
    Ok(sorted_apps)
}

#[tauri::command]
fn remove_registered_app(path: String) -> Result<Vec<RegisteredApp>, String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("App path is required.".to_string());
    }

    let apps = read_registered_apps()?;
    let retained_apps: Vec<RegisteredApp> = apps
        .into_iter()
        .filter(|app| !app.path.eq_ignore_ascii_case(trimmed_path))
        .collect();

    let sorted_apps = sort_and_dedupe_apps(retained_apps);
    write_registered_apps(&sorted_apps)?;
    Ok(sorted_apps)
}

#[tauri::command]
fn scan_installed_apps() -> Vec<RegisteredApp> {
    let mut discovered_apps: Vec<RegisteredApp> = Vec::new();
    let home_dir = env::var("HOME").ok().map(PathBuf::from);

    collect_apps_from_directory(Path::new("/Applications"), &mut discovered_apps);
    if let Some(home_dir) = home_dir {
        collect_apps_from_directory(&home_dir.join("Applications"), &mut discovered_apps);
    }

    sort_and_dedupe_apps(discovered_apps)
}

#[tauri::command]
fn launch_registered_app(path: String) -> Result<(), String> {
    let normalized_path = normalize_app_path(&path)?;

    let output = Command::new("open")
        .arg(&normalized_path)
        .output()
        .map_err(|error| format!("Failed to execute open command: {error}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err(format!("Failed to launch app at {normalized_path}"))
        } else {
            Err(format!("Failed to launch app at {normalized_path}: {stderr}"))
        }
    }
}

#[tauri::command]
fn get_running_registered_apps(paths: Vec<String>) -> Vec<RunningRegisteredApp> {
    let commands = read_process_commands_snapshot();

    paths
        .into_iter()
        .map(|path| {
            let running = bundle_name_from_app_path(&path)
                .map(|bundle_name| is_app_running_in_commands(&bundle_name, &commands))
                .unwrap_or(false);

            RunningRegisteredApp { path, running }
        })
        .collect()
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show_main_window(app);
        }
    }
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_launcher_item = MenuItem::with_id(
        app,
        TRAY_MENU_ID_OPEN_LAUNCHER,
        "Open Launcher",
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, TRAY_MENU_ID_QUIT, "Quit", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&open_launcher_item, &quit_item])?;

    let tray_icon = app
        .default_window_icon()
        .cloned()
        .expect("default window icon should be available");

    TrayIconBuilder::with_id("launcher-tray")
        .icon(tray_icon)
        .menu(&tray_menu)
        .tooltip("HYMetaLab Launcher")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_MENU_ID_OPEN_LAUNCHER => {
                show_main_window(app);
            }
            TRAY_MENU_ID_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
fn read_cci_signals() -> Result<CciSignalsResponse, String> {
    let home_dir = env::var("HOME").map_err(|error| format!("Could not resolve HOME: {error}"))?;
    let bus_dir = Path::new(&home_dir).join(".hymetalab/shared/cci-bus");

    fs::create_dir_all(&bus_dir)
        .map_err(|error| format!("Failed to create cci-bus directory: {error}"))?;

    let companion = read_signal_file(&bus_dir.join("companion-signals.jsonl"));
    let dugout = read_signal_file(&bus_dir.join("dugout-signals.jsonl"));
    let hmm = read_signal_file(&bus_dir.join("hmm-signals.jsonl"));

    Ok(CciSignalsResponse {
        companion,
        dugout,
        hmm,
    })
}

#[tauri::command]
fn get_running_apps() -> RunningAppsResponse {
    let commands = read_process_commands_snapshot();

    RunningAppsResponse {
        companion: is_app_running_in_commands("Companion", &commands),
        dugout: is_app_running_in_commands("Dugout", &commands),
        hmm: is_app_running_in_commands("HM Admin Console", &commands),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            setup_tray(&app.handle())?;

            let auto_launch = app.autolaunch();
            if !auto_launch.is_enabled().unwrap_or(false) {
                let _ = auto_launch.enable();
            }

            let launched_from_autostart = env::args().any(|arg| arg == "--autostart");
            if launched_from_autostart {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::Focused(false) = event {
                let _ = window.hide();
            }
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin({
            let builder = tauri_plugin_autostart::Builder::new().args(["--autostart"]);

            #[cfg(target_os = "macos")]
            let builder = builder.macos_launcher(MacosLauncher::LaunchAgent);

            builder.build()
        })
        .invoke_handler(tauri::generate_handler![
            launch_app,
            read_cci_signals,
            get_running_apps,
            get_registered_apps,
            add_registered_app,
            remove_registered_app,
            scan_installed_apps,
            launch_registered_app,
            get_running_registered_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        bundle_name_from_app_path,
        is_app_running_in_commands,
        is_launchable_app_process_line,
        sort_and_dedupe_apps,
        RegisteredApp,
    };

    #[test]
    fn detects_app_process_from_any_location_case_insensitive() {
        let line = "/Users/jordanheckler/companion/src-tauri/target/release/bundle/macos/companion.app/Contents/MacOS/app";
        assert!(is_launchable_app_process_line(line, "Companion"));
    }

    #[test]
    fn ignores_sidecar_processes() {
        let line = "/Applications/Dugout.app/Contents/MacOS/backend-sidecar";
        assert!(!is_launchable_app_process_line(line, "Dugout"));
    }

    #[test]
    fn ignores_sidecar_processes_with_arguments() {
        let line = "/Applications/Dugout.app/Contents/MacOS/backend-sidecar --port 7001";
        assert!(!is_launchable_app_process_line(line, "Dugout"));
    }

    #[test]
    fn does_not_cross_match_other_bundles() {
        let line = "/Applications/Dugout.app/Contents/MacOS/app";
        assert!(!is_launchable_app_process_line(line, "Companion"));
    }

    #[test]
    fn running_state_uses_matching_non_sidecar_processes_only() {
        let commands = "\
/Applications/Dugout.app/Contents/MacOS/backend-sidecar
/Users/jordanheckler/companion/src-tauri/target/release/bundle/macos/companion.app/Contents/MacOS/app
";
        assert!(is_app_running_in_commands("Companion", commands));
        assert!(!is_app_running_in_commands("Dugout", commands));
    }

    #[test]
    fn supports_bundle_names_with_spaces() {
        let commands = "/Applications/HM Admin Console.app/Contents/MacOS/app";
        assert!(is_app_running_in_commands("HM Admin Console", commands));
    }

    #[test]
    fn derives_bundle_name_from_path() {
        let bundle_name = bundle_name_from_app_path("/Applications/Companion.app");
        assert_eq!(bundle_name, Some("Companion".to_string()));
    }

    #[test]
    fn sort_and_dedupe_apps_dedupes_case_insensitive_paths() {
        let apps = vec![
            RegisteredApp {
                name: "Dugout".to_string(),
                path: "/Applications/Dugout.app".to_string(),
            },
            RegisteredApp {
                name: "Companion".to_string(),
                path: "/Applications/companion.app".to_string(),
            },
            RegisteredApp {
                name: "Companion Updated".to_string(),
                path: "/applications/Companion.app".to_string(),
            },
        ];

        let result = sort_and_dedupe_apps(apps);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "Companion Updated");
        assert_eq!(result[1].name, "Dugout");
    }
}
