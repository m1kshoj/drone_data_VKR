const Database = require('better-sqlite3');

const db = new Database('sensor_data.db', { verbose: console.log });

db.prepare(`
    CREATE TABLE IF NOT EXISTS Drone (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        model TEXT NOT NULL,
        weight REAL NOT NULL,
        max_height REAL NOT NULL,
        max_temperature REAL NOT NULL,
        max_altitude REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS Flight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        drone_id INTEGER NOT NULL,
        flight_time REAL NOT NULL,
        location_graph BLOB,
        height_graph BLOB,
        temperature_graph BLOB,
        altitude_graph BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drone_id) REFERENCES Drone(id) ON DELETE CASCADE
    )
`).run();

const insertDrone = db.prepare(`
    INSERT INTO Drone (name, model, weight, max_height, max_temperature, max_altitude)
    VALUES (?, ?, ?, ?, ?, ?)
`);

insertDrone.run('drone1', 'Model X', 2.5, 5000, 60, 10000);

insertDrone.run('drone2', 'Model Y', 3.0, 6000, 70, 12000);

db.close();