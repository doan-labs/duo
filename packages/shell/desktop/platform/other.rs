use super::Platform;

pub struct Other;

impl Platform for Other {
    fn name(&self) -> &'static str {
        "other"
    }

    fn open_url(&self, url: &str) -> Result<(), String> {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("xdg-open failed: {e}"))
    }
}
