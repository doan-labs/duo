// Desktop shell. Wires only: every feature lives in commands/, every OS
// difference in platform/. Adding a feature is one file there and one line here.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod platform;

fn main() {
    tauri::Builder::default()
        .invoke_handler(commands::handler())
        .run(tauri::generate_context!())
        .expect("iPhone Duo failed to start");
}
