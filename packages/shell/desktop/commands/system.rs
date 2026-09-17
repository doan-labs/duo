use crate::platform::{self, Platform};

/// Which OS the shell runs on, so the web side can adjust chrome if it must.
#[tauri::command]
pub fn platform_name() -> &'static str {
    platform::current().name()
}
