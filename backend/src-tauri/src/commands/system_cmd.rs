use crate::utils::system;

#[tauri::command]
pub fn prevent_sleep() {
    system::prevent_sleep();
}

#[tauri::command]
pub fn allow_sleep() {
    system::allow_sleep();
}
