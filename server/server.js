const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const Drone = require('./models/drone');
const db = require('./db/db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const drones = new Map();
const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});


app.post('/launch/:id', (req, res) => {
    const droneId = req.params.id;
    console.log(`Запуск дрона: ${droneId}`);

    const droneData = db.prepare('SELECT * FROM Drone WHERE name = ?').get(droneId);
    if (!droneData) {
        return res.status(404).json({ error: 'Дрон не найден в базе данных' });
    }

    const drone = new Drone(droneId);
    drones.set(droneId, drone);
    drone.takeOff();

    const flightTime = 0;
    db.prepare(`
        INSERT INTO Flight (drone_id, flight_time)
        VALUES (?, ?)
    `).run(droneData.id, flightTime);

    res.sendStatus(200);
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

app.post('/drones', (req, res) => {
    try {
        const { name, model, weight, max_height, max_temperature, max_altitude } = req.body;

        const existingDrone = db.prepare('SELECT * FROM Drone WHERE name = ?').get(name);
        if (existingDrone) {
            return res.status(400).json({ error: 'Дрон с таким именем уже существует' });
        }

        const result = db.prepare(`
            INSERT INTO Drone (name, model, weight, max_height, max_temperature, max_altitude)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(name, model, weight, max_height, max_temperature, max_altitude);

        res.status(201).json({ id: result.lastInsertRowid });
    } catch (error) {
        console.error('Ошибка при создании дрона:', error);
        res.status(500).json({ error: 'Ошибка при создании дрона' });
    }
});

// удалить дрона
app.delete('/drones/:name', (req, res) => {
    try {
        const { name } = req.params;

        db.prepare('DELETE FROM Flight WHERE drone_id = (SELECT id FROM Drone WHERE name = ?)').run(name);

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
        const { newName, model, weight, max_height, max_temperature, max_altitude } = req.body;

        // Проверка существования дрона
        const existingDrone = db.prepare('SELECT * FROM Drone WHERE name = ?').get(name);
        if (!existingDrone) {
            return res.status(404).json({ error: 'Дрон не найден' });
        }

        const result = db.prepare(`
            UPDATE Drone 
            SET name = ?, model = ?, weight = ?, max_height = ?, max_temperature = ?, max_altitude = ?
            WHERE name = ?
        `).run(newName, model, weight, max_height, max_temperature, max_altitude, name);

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
                max_height,
                max_temperature,
                max_altitude 
            FROM Drone 
            WHERE name = ?
        `).get(name);

        if (!drone) return res.status(404).json({ error: 'Дрон не найден' });

        res.json(drone);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});