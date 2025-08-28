use rusqlite::{Connection, Result};

pub fn create_schema(conn: &Connection) -> Result<()> {
    let qry: &'static str = r#"
        -- ============================================
        -- Database setup for Growth Timer (MEJORADO)
        -- ============================================

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            total_time_minutes INTEGER DEFAULT 0,
            color VARCHAR(7) NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            id_category INTEGER NOT NULL,
            color VARCHAR(7),
            total_time_minutes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (id_category) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(255) NOT NULL,
            id_project INTEGER NOT NULL,
            target_minutes INTEGER DEFAULT 0,
            completed_minutes INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (id_project) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(7),
            total_time_minutes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS pomodoros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            minutes INTEGER DEFAULT 25,
            id_project INTEGER NOT NULL,
            id_goal INTEGER,
            id_task INTEGER NOT NULL,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (id_project) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (id_goal) REFERENCES goals(id) ON DELETE SET NULL,
            FOREIGN KEY (id_task) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(id_category);
        CREATE INDEX IF NOT EXISTS idx_goals_project ON goals(id_project);
        CREATE INDEX IF NOT EXISTS idx_pomodoros_project ON pomodoros(id_project);
        CREATE INDEX IF NOT EXISTS idx_pomodoros_task ON pomodoros(id_task);
        CREATE INDEX IF NOT EXISTS idx_pomodoros_goal ON pomodoros(id_goal);
        CREATE INDEX IF NOT EXISTS idx_pomodoros_date ON pomodoros(created_at);

        INSERT OR IGNORE INTO categories (id, name, color) VALUES 
            (1, 'Personal', '#10B981'),
            (2, 'Work', '#3B82F6'),
            (3, 'Health', '#EF4444'),
            (4, 'Studies', '#8B5CF6'),
            (5, 'Finances', '#F59E0B'),
            (6, 'Home', '#06B6D4'),
            (7, 'Creativity', '#EC4899'),
            (8, 'Relationships', '#84CC16'),
            (9, 'Fitness', '#F97316'),
            (10, 'Hobbies', '#6366F1');

        INSERT OR IGNORE INTO tasks (id, name, color) VALUES 
            (1, 'Read', '#10B981'),
            (2, 'Study', '#8B5CF6'),
            (3, 'Practice', '#F59E0B'),
            (4, 'Debug', '#EF4444'),
            (5, 'Plan', '#3B82F6'),
            (6, 'Research', '#06B6D4'),
            (7, 'Document', '#84CC16'),
            (8, 'Review', '#F97316'),
            (9, 'Refactor', '#EC4899'),
            (10, 'Design', '#6366F1'),
            (11, 'Meditate', '#10B981'),
            (12, 'Exercise', '#EF4444'),
            (13, 'Cook', '#F59E0B'),
            (14, 'Organize', '#06B6D4');
    "#;

    conn.execute_batch(qry)?;

    // Insert example project if there are no projects yet
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))?;
    if count == 0 {
        conn.execute(
            "INSERT INTO projects (name, id_category, color) VALUES (?1, ?2, ?3)",
            ("Example Project", 1, "#FFFFFF"),
        )?;

        // insert goals and pomodoros
        conn.execute(
            "INSERT INTO goals (title, id_project, target_minutes) VALUES (?1, ?2, ?3)",
            ("Example Goal", 1, 1),
        )?;

        conn.execute(
            "INSERT INTO pomodoros (minutes, id_project, id_goal, id_task) VALUES (?1, ?2, ?3, ?4)",
            (25, 1, 1, 1),
        )?;
    }

    Ok(())
}
