// server.js
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

// Запуск сервера
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

// API для запуска дронов
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
        res.json(drones); // Отправляем данные в формате JSON
    } catch (error) {
        console.error('Ошибка при получении дронов:', error);
        res.status(500).json({ error: 'Ошибка при получении данных о дронах' });
    }
});

app.delete('/delete/:id', (req, res) => {
    const droneId = req.params.id;
    const drone = drones.get(droneId);
    if (drone) {
        drone.land();
        drones.delete(droneId);
    }
    res.sendStatus(200);
});