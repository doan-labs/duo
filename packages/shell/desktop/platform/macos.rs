use super::Platform;

pub struct MacOS;

impl Platform for MacOS {
    fn name(&self) -> &'static str {
        "macos"
    }
}
