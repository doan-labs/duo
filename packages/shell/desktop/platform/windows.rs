use super::Platform;

pub struct Windows;

impl Platform for Windows {
    fn name(&self) -> &'static str {
        "windows"
    }
}
