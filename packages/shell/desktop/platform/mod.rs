//! OS-specific code lives here and nowhere else. Feature code calls the trait;
//! `#[cfg(target_os)]` appears in this module only.

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod other;

pub trait Platform {
    fn name(&self) -> &'static str;
    /// Open an already validated http(s) URL in the user's default browser.
    fn open_url(&self, url: &str) -> Result<(), String>;
}

pub fn current() -> impl Platform {
    #[cfg(target_os = "macos")]
    return macos::MacOS;
    #[cfg(target_os = "windows")]
    return windows::Windows;
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    return other::Other;
}
