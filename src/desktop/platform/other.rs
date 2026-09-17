use super::Platform;

pub struct Other;

impl Platform for Other {
    fn name(&self) -> &'static str {
        "other"
    }
}
