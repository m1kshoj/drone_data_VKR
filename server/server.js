const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const Drone = require('./models/drone');
const db = require('./db/db');

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const drones = new Map();
const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});


app.post('/launch/:id', (req, res) => {
    const droneId = req.params.id;
    console.log(`Запуск дрона (симуляция): ${droneId}`);

    const droneData = db.prepare('SELECT * FROM Drone WHERE name = ?').get(droneId);
    if (!droneData) {
        return res.status(404).json({ error: 'Дрон не найден в базе данных для симуляции' });
    }
    res.status(200).json({ message: 'Команда запуска (симуляция) принята.'});
});

wss.on('connection', (ws) => {
    console.log('Новое подключение WebSocket');
    const interval = setInterval(() => {
        const data = Array.from(drones.values())
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

app.get('/drones', (req, res) => {
    try {
        const drones = db.prepare('SELECT * FROM Drone').all();
        res.json(drones);
    } catch (error) {
        console.error('Ошибка при получении дронов:', error);
        res.status(500).json({ error: 'Ошибка при получении данных о дронах' });
    }
});

// создание дрона
app.post('/drones', (req, res) => {
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
});

// удалить дрон
app.delete('/drones/:name', (req, res) => {
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
});

//данные дрона по имени
app.get('/drones/:name', (req, res) => {
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
});

//обновление дрона
app.put('/drones/:name', (req, res) => {
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
});

// для карточки дрона
app.get('/drones/:name', (req, res) => {
    try {
        const { name } = req.params;
        const drone = db.prepare(`
            SELECT 
                name,
                model,
                weight,
                max_altitude,
                min_temperature,
                min_pressure 
            FROM Drone 
            WHERE name = ?
        `).get(name);

        if (!drone) return res.status(404).json({ error: 'Дрон не найден' });

        res.json(drone);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Сохранение данных полёта
app.post('/flights', (req, res) => {
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

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

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
});

// Получение списка всех полётов
app.get('/flights', (req, res) => {
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
});

// Удаление полёта по ID
app.delete('/flights/:id', (req, res) => {
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
});