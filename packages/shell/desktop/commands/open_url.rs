use crate::platform::{self, Platform};

/// Hand an http(s) link to the user's browser. The web side never opens a
/// window itself on desktop, where `window.open` has no chrome to land in.
///
/// Only plain http(s) URLs pass: the Windows implementation goes through `cmd`,
/// which still expands `%VAR%` and splits on `&` even with no shell in between,
/// so characters it treats specially are refused rather than escaped.
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Only http and https links can be opened".into());
    }
    if url
        .chars()
        .any(|c| c.is_whitespace() || c.is_control() || "\"&|^<>%".contains(c))
    {
        return Err("Link contains characters that cannot be passed to the browser".into());
    }
    platform::current().open_url(&url)
}
