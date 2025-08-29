use windows::Win32::System::Power::SetThreadExecutionState;
use windows::Win32::System::Power::{ES_CONTINUOUS, ES_SYSTEM_REQUIRED};

pub fn prevent_sleep() {
    unsafe {
        SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED);
    }
}

pub fn allow_sleep() {
    unsafe {
        SetThreadExecutionState(ES_CONTINUOUS);
    }
}
