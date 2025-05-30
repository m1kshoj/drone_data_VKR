// db.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sensor_data.db');
const db = new Database(dbPath, { verbose: console.log });

db.prepare(`
    CREATE TABLE IF NOT EXISTS Drone (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        model TEXT NOT NULL,
        weight REAL NOT NULL,
        max_altitude REAL NOT NULL,
        min_temperature REAL NOT NULL,
        min_pressure REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS Flight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        naming TEXT NOT NULL,
        drone_id INTEGER,
        drone_name TEXT NOT NULL,
        flight_time REAL NOT NULL,
        location_graph BLOB,
        altitude_graph BLOB,
        temperature_graph BLOB,
        pressure_graph BLOB,
        max_flight_altitude REAL,
        min_flight_temperature REAL,
        min_flight_pressure REAL,
        warnings TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (drone_id) REFERENCES Drone(id) ON DELETE SET NULL
    )
`).run();

module.exports = db;