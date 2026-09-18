//! Commands the web side can call through `packages/shell/native.ts`. One file per feature.

mod open_url;
mod system;

pub fn handler() -> impl Fn(tauri::ipc::Invoke) -> bool {
    tauri::generate_handler![system::platform_name, open_url::open_url]
}
