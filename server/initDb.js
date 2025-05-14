const Database = require('better-sqlite3');
const db = new Database('sensor_data.db', { verbose: console.log });

// Создаём таблицы без DEFAULT для created_at и updated_at
db.prepare(`
    CREATE TABLE IF NOT EXISTS Drone (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        model TEXT NOT NULL,
        weight REAL NOT NULL,
        max_altitude REAL NOT NULL,
        min_temperature REAL NOT NULL,
        min_pressure REAL NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
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

function getCurrentDateTime() {
    return new Date().toLocaleString('sv-SE', {
        timeZone: 'Europe/Moscow'
    });
}

const insertDrone = db.prepare(`
    INSERT INTO Drone (name, model, weight, max_altitude, min_temperature, min_pressure, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const now1 = getCurrentDateTime();
insertDrone.run(
    'DJI Mavic 3',
    'Mavic 3 Pro',
    0.895,
    500,
    -10,
    800,
    now1,
    now1
);

const now2 = getCurrentDateTime();
insertDrone.run(
    'Autel Evo II',
    'Evo II Dual 640T',
    1.2,
    600,
    -20,
    700,
    now2,
    now2
);

db.close();