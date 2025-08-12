use tauri_plugin_sql::{Migration, MigrationKind};
use std::env;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    Migration {
      version: 1,
      description: "create_pdfs_table",
      sql: "CREATE TABLE IF NOT EXISTS pdfs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_opened DATETIME DEFAULT CURRENT_TIMESTAMP
      );",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "create_highlights_table",
      sql: "CREATE TABLE IF NOT EXISTS highlights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pdf_id INTEGER NOT NULL,
        highlight_id TEXT NOT NULL,
        content_text TEXT,
        content_image TEXT,
        comment_text TEXT,
        comment_emoji TEXT,
        position_data TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE
      );",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "create_tags_table",
      sql: "CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 4,
      description: "create_highlight_tags_table",
      sql: "CREATE TABLE IF NOT EXISTS highlight_tags (
        highlight_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (highlight_id, tag_id),
        FOREIGN KEY (highlight_id) REFERENCES highlights(highlight_id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 5,
      description: "add_unique_constraint_to_highlight_id",
      sql: "
        -- Create new highlights table with UNIQUE constraint on highlight_id
        CREATE TABLE highlights_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pdf_id INTEGER NOT NULL,
          highlight_id TEXT NOT NULL UNIQUE,
          content_text TEXT,
          content_image TEXT,
          comment_text TEXT,
          comment_emoji TEXT,
          position_data TEXT NOT NULL,
          page_number INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pdf_id) REFERENCES pdfs(id) ON DELETE CASCADE
        );
        
        -- Copy all data from old highlights table
        INSERT INTO highlights_new 
        SELECT * FROM highlights;
        
        -- Drop old highlight_tags table (will be recreated with proper foreign key)
        DROP TABLE IF EXISTS highlight_tags;
        
        -- Drop old highlights table
        DROP TABLE highlights;
        
        -- Rename new table to highlights
        ALTER TABLE highlights_new RENAME TO highlights;
        
        -- Recreate highlight_tags with correct foreign key referencing the UNIQUE column
        CREATE TABLE highlight_tags (
          highlight_id TEXT NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (highlight_id, tag_id),
          FOREIGN KEY (highlight_id) REFERENCES highlights(highlight_id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
      ",
      kind: MigrationKind::Up,
    },
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:pdf_highlighter.db", migrations)
        .build(),
    )
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
        
        // Check for custom dev server URL from environment
        if let Ok(dev_url) = env::var("TAURI_DEV_SERVER_URL") {
          println!("🌐 Using custom dev server URL: {}", dev_url);
        } else if let Ok(dev_port) = env::var("DEV_PORT") {
          let dev_url = format!("http://localhost:{}", dev_port);
          println!("🌐 Using dev server port: {} -> {}", dev_port, dev_url);
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
