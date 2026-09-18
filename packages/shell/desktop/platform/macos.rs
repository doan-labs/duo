use super::Platform;

pub struct MacOS;

impl Platform for MacOS {
    fn name(&self) -> &'static str {
        "macos"
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("open failed: {e}"))
    }
}
