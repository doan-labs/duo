use super::Platform;

pub struct Windows;

impl Platform for Windows {
    fn name(&self) -> &'static str {
        "windows"
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        // The empty argument is `start`'s title slot; without it `start` takes the URL as the title.
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("start failed: {e}"))
    }
}
