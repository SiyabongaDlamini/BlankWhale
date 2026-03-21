use serde::Serialize;
use sysinfo::System;

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

    // Check for Apple Silicon (Metal GPU)
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
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_system_info, greet])
        .run(tauri::generate_context!())
        .expect("error while running BlankWhale");
}
