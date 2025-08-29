#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri_plugin_opener;

mod analytics;
mod commands;
mod config;
mod db;
mod models;
mod services;
mod utils;

use config::get_db_path;
use db::schema::create_schema;
use db::triggers::create_triggers;
use db::Database;
use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_categories,
            commands::get_tasks,
            commands::get_pomodoros,
            commands::get_projects,
            commands::create_project,
            commands::create_goal,
            commands::create_pomodoro,
            commands::delete_project,
            commands::delete_goal,
            commands::delete_pomodoro,
            commands::get_summary_report,
            commands::prevent_sleep,
            commands::allow_sleep,
        ])
        .setup(|app| {
            println!("Running app...");

            // 1. DB Route
            let db_path = get_db_path();
            println!("DB Route: {}", db_path.display());

            // 2. DB Connection
            let db_path_str = db_path.to_string_lossy();
            let mut database = Database::new(&db_path_str).unwrap_or_else(|e| {
                eprintln!("Error connecting to the database: {}", e);
                Database::new_in_memory().expect("It couldn't even be done in memory.")
            });

            // 3. Schema & Triggers setup
            {
                let conn = database.get_conn();
                if let Err(e) = create_schema(&conn) {
                    eprintln!("Error creating schema: {}", e);
                    std::process::exit(1);
                }

                if let Err(e) = create_triggers(&conn) {
                    eprintln!("Error creating triggers: {}", e);
                    std::process::exit(1);
                }
            }

            // 4. Share connection
            let database = Arc::new(Mutex::new(database));
            app.manage(database);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error running the app");
}
