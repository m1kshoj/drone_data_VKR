const db = require('./db'); // Подключаем базу данных

class Drone {
    constructor(id) {
        this.id = id;
        this.isFlying = false;
        this.altitude = 0;
        this.baseTemperature = 15;
        this.basePressure = 1013.25;
        this.temperature = this.baseTemperature;
        this.pressure = this.basePressure;
        this.interval = null;
        this.flightId = null; // ID полета в базе данных
    }

    takeOff() {
        this.isFlying = true;

        // Сохраняем информацию о полете в базу данных
        const droneData = db.prepare('SELECT * FROM Drone WHERE name = ?').get(this.id);
        if (droneData) {
            const result = db.prepare(`
                INSERT INTO Flight (drone_id, flight_time)
                VALUES (?, ?)
            `).run(droneData.id, 0);
            this.flightId = result.lastInsertRowid; // Сохраняем ID полета
        }

        this.simulateFlight();
    }

    simulateFlight() {
        this.interval = setInterval(() => {
            if (this.isFlying) {
                this.altitude += Math.random() * 10 + 5;
                this.temperature = this.baseTemperature - (this.altitude / 1000 * 6.5) + (Math.random() - 0.5);
                this.pressure = this.basePressure - (this.altitude / 8) + (Math.random() - 0.5) * 0.2;
                this.pressure = Math.max(this.pressure, 200);
                this.temperature = Math.max(this.temperature, -60);

                // Обновляем данные о полете в базе данных
                if (this.flightId) {
                    db.prepare(`
                        UPDATE Flight
                        SET flight_time = flight_time + 1,
                            altitude_graph = ?,
                            temperature_graph = ?,
                            pressure_graph = ?
                        WHERE id = ?
                    `).run(
                        JSON.stringify({ altitude: this.altitude }),
                        JSON.stringify({ temperature: this.temperature }),
                        JSON.stringify({ pressure: this.pressure }),
                        this.flightId
                    );
                }
            }
        }, 1000);
    }

    land() {
        clearInterval(this.interval);
        this.isFlying = false;

        if (this.flightId) {
            db.prepare(`
                UPDATE Flight
                SET flight_time = flight_time + 1,
                    altitude_graph = ?,
                    temperature_graph = ?,
                    pressure_graph = ?
                WHERE id = ?
            `).run(
                JSON.stringify({ altitude: this.altitude }),
                JSON.stringify({ temperature: this.temperature }),
                JSON.stringify({ pressure: this.pressure }),
                this.flightId
            );
        }
    }
}

module.exports = Drone;