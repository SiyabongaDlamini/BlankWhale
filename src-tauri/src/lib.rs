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

/// Try to find a working python command with necessary AI libraries.
/// macOS GUI apps strip PATH, so we must explicitly check Homebrew/Conda or local venv.
fn find_python(app_handle: &tauri::AppHandle, engine_dir: &std::path::Path) -> String {
    // 1. Check for persistent virtual environment in app_data_dir
    if let Ok(data_dir) = app_handle.path().app_data_dir() {
        #[cfg(target_os = "windows")]
        let venv_python = data_dir.join("ai_venv").join("Scripts").join("python.exe");
        #[cfg(not(target_os = "windows"))]
        let venv_python = data_dir.join("ai_venv").join("bin").join("python3");

        if venv_python.exists() {
            return venv_python.to_string_lossy().to_string();
        }
    }

    // 2. Check for local virtual environment (ai_venv) in engine_dir (Dev fallback)
    #[cfg(target_os = "windows")]
    let venv_python = engine_dir.join("ai_venv").join("Scripts").join("python.exe");
    #[cfg(not(target_os = "windows"))]
    let venv_python = engine_dir.join("ai_venv").join("bin").join("python3");

    if venv_python.exists() {
        return venv_python.to_string_lossy().to_string();
    }

    // 3. Check Homebrew/Conda/System candidates
    let candidates = [
        "/opt/homebrew/bin/python3", // Apple Silicon Homebrew
        "/usr/local/bin/python3",    // Intel Homebrew
        "/opt/anaconda3/bin/python3",// Conda
        "python3",                   // Default PATH
        "/usr/bin/python3",          // System fallback
    ];
    for p in candidates.iter() {
        if Command::new(p).arg("--version").output().is_ok() {
            return p.to_string();
        }
    }
    "python".to_string()
}

/// Dynamically find the engine directory.
/// In dev: walk up from exe. In production: use resource_dir.
fn find_engine_dir(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        // Tauri v2 transforms `../engine` into `_up_/engine` during bundling to prevent traversal
        let engine_path = resource_dir.join("_up_").join("engine");
        if engine_path.exists() {
            return engine_path;
        }
        // Fallback if bundled differently
        let engine_path_alt = resource_dir.join("engine");
        if engine_path_alt.exists() {
            return engine_path_alt;
        }
    }

    // 2. Development path (walking up from exe)
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe;
        while dir.pop() {
            let engine_path = dir.join("engine");
            if engine_path.exists() {
                return engine_path;
            }
        }
    }
    std::env::current_dir().unwrap_or_else(|_| ".".into()).join("engine")
}

/// Spawn the Python WebSocket engine as a child process.
fn spawn_engine(app_handle: &tauri::AppHandle) -> Option<Child> {
    let engine_dir = find_engine_dir(app_handle);
    let python = find_python(app_handle, &engine_dir);
    log::info!("Starting engine with: {} -m engine.server from {:?}", python, engine_dir);

    let parent_dir = engine_dir.parent().unwrap_or(&engine_dir);
    let app_data_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| std::env::temp_dir());
    let hf_home = app_data_dir.join("hf_cache");
    let _ = std::fs::create_dir_all(&hf_home);

    match Command::new(&python)
        .args(["-m", "engine.server"])
        .current_dir(parent_dir)
        .env("BLANKWHALE_DATA_DIR", &app_data_dir)
        .env("HF_HOME", &hf_home)
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
    installed: bool,
    pid: Option<u32>,
}

#[tauri::command]
fn get_engine_status(app_handle: tauri::AppHandle, state: tauri::State<EngineProcess>) -> EngineStatus {
    let engine_dir = find_engine_dir(&app_handle);
    let python = find_python(&app_handle, &engine_dir);
    
    // Check if we are using a venv (installed)
    let installed = python.contains("ai_venv");

    if let Ok(mut guard) = state.0.lock() {
        if let Some(ref mut child) = *guard {
            // Check if still alive
            match child.try_wait() {
                Ok(None) => return EngineStatus { running: true, installed, pid: Some(child.id()) },
                _ => { *guard = None; }
            }
        }
    }
    EngineStatus { running: false, installed, pid: None }
}

#[tauri::command]
async fn setup_engine(app_handle: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    
    let engine_dir = find_engine_dir(&app_handle);
    let requirements = engine_dir.join("requirements.txt");
    
    if !requirements.exists() {
        return Err("requirements.txt not found in engine directory".into());
    }

    log::info!("Setting up AI engine in {:?}", data_dir);

    // 1. Create venv
    let venv_status = Command::new("python3")
        .args(["-m", "venv", "ai_venv"])
        .current_dir(&data_dir)
        .status()
        .map_err(|e| e.to_string())?;
    
    if !venv_status.success() {
        return Err("Failed to create virtual environment".into());
    }

    // 2. Install requirements
    #[cfg(target_os = "windows")]
    let pip = data_dir.join("ai_venv").join("Scripts").join("pip.exe");
    #[cfg(not(target_os = "windows"))]
    let pip = data_dir.join("ai_venv").join("bin").join("pip");

    let pip_status = Command::new(pip)
        .args(["install", "-r", requirements.to_str().unwrap()])
        .status()
        .map_err(|e| e.to_string())?;

    if !pip_status.success() {
        return Err("Failed to install requirements".into());
    }

    Ok("Engine setup complete".into())
}

#[tauri::command]
fn restart_engine(app_handle: tauri::AppHandle, state: tauri::State<EngineProcess>) -> EngineStatus {
    kill_engine(&state);
    if let Ok(mut guard) = state.0.lock() {
        *guard = spawn_engine(&app_handle);
        if let Some(ref child) = *guard {
            // Re-check installed status
            let engine_dir = find_engine_dir(&app_handle);
            let python = find_python(&app_handle, &engine_dir);
            let installed = python.contains("ai_venv");

            return EngineStatus { running: true, installed, pid: Some(child.id()) };
        }
    }
    // We need to return the status even if it failed to start
    let engine_dir = find_engine_dir(&app_handle);
    let python = find_python(&app_handle, &engine_dir);
    let installed = python.contains("ai_venv");
    EngineStatus { running: false, installed, pid: None }
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
            let app_handle = app.handle().clone();
            let state = app.state::<EngineProcess>();
            if let Ok(mut guard) = state.0.lock() {
                *guard = spawn_engine(&app_handle);
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
            restart_engine,
            setup_engine
        ])
        .run(tauri::generate_context!())
        .expect("error while running BlankWhale");
}
