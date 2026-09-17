//! Commands the web side can call through `packages/shell/native.ts`. One file per feature.

mod system;

pub fn handler() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![system::platform_name]
}
