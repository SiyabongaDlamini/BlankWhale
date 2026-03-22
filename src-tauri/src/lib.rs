use serde::Serialize;
use sysinfo::System;
use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::Manager;

/// Global handle to the Python engine child process.
struct EngineProcess(Mutex<Option<Child>>);

#[derive(Serialize)]
pub struct SystemInfo {
    os: String,
    os_version: String,
    cpu_name: String,
    cpu_cores: usize,
    total_memory_gb: f64,
    available_memory_gb: f64,
    gpu_detected: bool,
    gpu_name: String,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_name = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let is_apple_silicon = cpu_name.contains("Apple M");
    let gpu_name = if is_apple_silicon {
        format!("{} (Metal GPU)", cpu_name)
    } else {
        "Check CUDA with nvidia-smi".to_string()
    };

    SystemInfo {
        os: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_name,
        cpu_cores: sys.cpus().len(),
        total_memory_gb: sys.total_memory() as f64 / 1_073_741_824.0,
        available_memory_gb: sys.available_memory() as f64 / 1_073_741_824.0,
        gpu_detected: is_apple_silicon,
        gpu_name,
    }
}

/// Try to find a working python command (python3 first, then python).
fn find_python() -> String {
    if Command::new("python3").arg("--version").output().is_ok() {
        "python3".to_string()
    } else {
        "python".to_string()
    }
}

/// Spawn the Python WebSocket engine as a child process.
fn spawn_engine() -> Option<Child> {
    let python = find_python();
    log::info!("Starting engine with: {} -m engine.server", python);

    match Command::new(&python)
        .args(["-m", "engine.server"])
        .current_dir(std::env::current_dir().unwrap_or_else(|_| ".".into()))
        .spawn()
    {
        Ok(child) => {
            log::info!("Engine started (PID {})", child.id());
            Some(child)
        }
        Err(e) => {
            log::error!("Failed to start engine: {}", e);
            None
        }
    }
}

/// Kill the running engine process, if any.
fn kill_engine(state: &EngineProcess) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(ref mut child) = *guard {
            log::info!("Stopping engine (PID {})", child.id());
            let _ = child.kill();
            let _ = child.wait();
        }
        *guard = None;
    }
}

#[derive(Serialize)]
pub struct EngineStatus {
    running: bool,
    pid: Option<u32>,
}

#[tauri::command]
fn get_engine_status(state: tauri::State<EngineProcess>) -> EngineStatus {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(ref mut child) = *guard {
            // Check if still alive
            match child.try_wait() {
                Ok(None) => return EngineStatus { running: true, pid: Some(child.id()) },
                _ => { *guard = None; }
            }
        }
    }
    EngineStatus { running: false, pid: None }
}

#[tauri::command]
fn restart_engine(state: tauri::State<EngineProcess>) -> EngineStatus {
    kill_engine(&state);
    if let Ok(mut guard) = state.0.lock() {
        *guard = spawn_engine();
        if let Some(ref child) = *guard {
            return EngineStatus { running: true, pid: Some(child.id()) };
        }
    }
    EngineStatus { running: false, pid: None }
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome to BlankWhale, {}!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(EngineProcess(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Auto-start engine on app launch
            let state = app.state::<EngineProcess>();
            if let Ok(mut guard) = state.0.lock() {
                *guard = spawn_engine();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.app_handle().state::<EngineProcess>();
                kill_engine(&state);
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            greet,
            get_engine_status,
            restart_engine
        ])
        .run(tauri::generate_context!())
        .expect("error while running BlankWhale");
}

