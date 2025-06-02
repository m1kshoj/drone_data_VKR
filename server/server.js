const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const Drone = require('./models/drone');
const db = require('./db/db');

class Server {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.drones = new Map();
        this.PORT = 3000;

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeWebSocket();
    }

    initializeMiddlewares() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '50mb' }));
    }

    initializeWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('Новое подключение WebSocket');
            const interval = setInterval(() => {
                const data = Array.from(this.drones.values())
                    .filter(drone => drone.isFlying)
                    .map(drone => ({
                        id: drone.id,
                        altitude: drone.altitude.toFixed(1),
                        temperature: drone.temperature.toFixed(1),
                        pressure: drone.pressure.toFixed(1),
                        isFlying: drone.isFlying
                    }));
                ws.send(JSON.stringify(data));
            }, 1000);
            ws.on('close', () => clearInterval(interval));
        });
    }

    initializeRoutes() {
        // Дроны
        this.app.post('/launch/:id', this.handleLaunchDrone.bind(this));
        this.app.get('/drones', this.handleGetDrones.bind(this));
        this.app.post('/drones', this.handleCreateDrone.bind(this));
        this.app.delete('/drones/:name', this.handleDeleteDrone.bind(this));
        this.app.get('/drones/:name', this.handleGetDroneByName.bind(this));
        this.app.put('/drones/:name', this.handleUpdateDrone.bind(this));

        // Полёты
        this.app.post('/flights', this.handleCreateFlight.bind(this));
        this.app.get('/flights', this.handleGetFlights.bind(this));
        this.app.delete('/flights/:id', this.handleDeleteFlight.bind(this));
    }

    // Обработчики для дронов
    handleLaunchDrone(req, res) {
        const droneId = req.params.id;
        console.log(`Запуск дрона (симуляция): ${droneId}`);

        const droneData = db.prepare('SELECT * FROM Drone WHERE name = ?').get(droneId);
        if (!droneData) {
            return res.status(404).json({ error: 'Дрон не найден в базе данных для симуляции' });
        }
        res.status(200).json({ message: 'Команда запуска (симуляция) принята.' });
    }

    handleGetDrones(req, res) {
        try {
            const drones = db.prepare('SELECT * FROM Drone').all();
            res.json(drones);
        } catch (error) {
            console.error('Ошибка при получении дронов:', error);
            res.status(500).json({ error: 'Ошибка при получении данных о дронах' });
        }
    }

    handleCreateDrone(req, res) {
        try {
            const { name, model, weight, max_altitude, min_temperature, min_pressure } = req.body;

            const existingDrone = db.prepare('SELECT * FROM Drone WHERE name = ?').get(name);
            if (existingDrone) {
                return res.status(400).json({ error: 'Дрон с таким именем уже существует' });
            }

            const result = db.prepare(`
                INSERT INTO Drone 
                (name, model, weight, max_altitude, min_temperature, min_pressure, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(name, model, weight, max_altitude, min_temperature, min_pressure);

            res.status(201).json({ id: result.lastInsertRowid });
        } catch (error) {
            console.error('Ошибка при создании дрона:', error);
            res.status(500).json({ error: 'Ошибка при создании дрона' });
        }
    }

    handleDeleteDrone(req, res) {
        try {
            const { name } = req.params;

            const droneToDelete = db.prepare('SELECT id FROM Drone WHERE name = ?').get(name);
            if (!droneToDelete) {
                return res.status(404).json({ error: 'Дрон не найден для удаления' });
            }
            const droneIdToDelete = droneToDelete.id;

            const result = db.prepare('DELETE FROM Drone WHERE name = ?').run(name);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Дрон не найден' });
            }

            res.sendStatus(204);
        } catch (error) {
            console.error('Ошибка удаления:', error);
            res.status(500).json({ error: 'Ошибка при удалении дрона' });
        }
    }

    handleGetDroneByName(req, res) {
        try {
            const { name } = req.params;
            const drone = db.prepare('SELECT * FROM Drone WHERE name = ?').get(name);

            if (!drone) {
                return res.status(404).json({ error: 'Дрон не найден' });
            }

            res.json(drone);
        } catch (error) {
            console.error('Ошибка при получении дрона:', error);
            res.status(500).json({ error: 'Ошибка при получении данных дрона' });
        }
    }

    handleUpdateDrone(req, res) {
        try {
            const { name } = req.params;
            const { newName, model, weight, max_altitude, min_temperature, min_pressure } = req.body;

            const existingDrone = db.prepare('SELECT * FROM Drone WHERE name = ?').get(name);
            if (!existingDrone) {
                return res.status(404).json({ error: 'Дрон не найден' });
            }

            const now = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' });

            const result = db.prepare(`
                UPDATE Drone 
                SET 
                    name = ?, 
                    model = ?, 
                    weight = ?, 
                    max_altitude = ?, 
                    min_temperature = ?, 
                    min_pressure = ?,
                    updated_at = ?
                WHERE name = ?
            `).run(newName, model, weight, max_altitude, min_temperature, min_pressure, now, name);

            res.json({
                message: 'Дрон успешно обновлен',
                changes: result.changes
            });
        } catch (error) {
            console.error('Ошибка при обновлении дрона:', error);
            res.status(500).json({ error: 'Ошибка при обновлении дрона' });
        }
    }

    // Обработчики для полётов
    handleCreateFlight(req, res) {
        try {
            const {
                naming,
                drone_id,
                flight_time,
                location_graph,
                altitude_graph,
                temperature_graph,
                pressure_graph,
                max_flight_altitude,
                min_flight_temperature,
                min_flight_pressure,
                warnings
            } = req.body;

            if (!naming || !drone_id || flight_time === undefined) {
                return res.status(400).json({ error: 'Отсутствуют обязательные поля: название, ID дрона, время полета.' });
            }

            const drone = db.prepare('SELECT name FROM Drone WHERE id = ?').get(drone_id);
            if (!drone) {
                return res.status(404).json({ error: 'Дрон для сохранения полета не найден.' });
            }
            const droneName = drone.name;

            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            const now = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            const result = db.prepare(`
                INSERT INTO Flight (
                    naming, drone_id, drone_name, flight_time, location_graph, altitude_graph,
                    temperature_graph, pressure_graph, max_flight_altitude,
                    min_flight_temperature, min_flight_pressure, warnings, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                naming, drone_id, droneName, flight_time, location_graph, altitude_graph,
                temperature_graph, pressure_graph, max_flight_altitude,
                min_flight_temperature, min_flight_pressure, warnings, now, now
            );

            res.status(201).json({ id: result.lastInsertRowid, message: 'Полет успешно сохранен.' });
        } catch (error) {
            console.error('Ошибка при сохранении полета:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера при сохранении полета.' });
        }
    }

    handleGetFlights(req, res) {
        try {
            const flights = db.prepare(`
                SELECT
                    f.id,
                    f.naming,
                    f.drone_name,
                    f.flight_time,
                    f.location_graph,
                    f.altitude_graph,
                    f.temperature_graph,
                    f.pressure_graph,
                    f.max_flight_altitude,
                    f.min_flight_temperature,
                    f.min_flight_pressure,
                    f.warnings,
                    strftime('%Y-%m-%d %H:%M:%S', f.created_at) as created_at
                FROM Flight f
                ORDER BY f.created_at DESC
            `).all();
            res.json(flights);
        } catch (error) {
            console.error('Ошибка при получении списка полетов:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера при получении списка полетов.' });
        }
    }

    handleDeleteFlight(req, res) {
        try {
            const { id } = req.params;
            const result = db.prepare('DELETE FROM Flight WHERE id = ?').run(id);

            if (result.changes === 0) {
                return res.status(404).json({ error: 'Полет не найден.' });
            }
            res.status(200).json({ message: 'Полет успешно удален.' });
        } catch (error) {
            console.error('Ошибка при удалении полета:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера при удалении полета.' });
        }
    }

    start() {
        this.server.listen(this.PORT, () => {
            console.log(`Сервер запущен на порту ${this.PORT}`);
        });
    }
}

const server = new Server();
server.start();