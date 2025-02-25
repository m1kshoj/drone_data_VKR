const port = 3000;
const ws = new WebSocket(`ws://localhost:${port}`);

async function launchDrone() {
    const droneId = Date.now().toString();
    try {
        const response = await fetch(`http://localhost:${port}/launch/${droneId}`, {
            method: 'POST'
        });
        console.log('Статус ответа:', response.status);
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

ws.onmessage = (event) => {
    const drones = JSON.parse(event.data);
    const dronesContainer = document.getElementById('drones-container');
    dronesContainer.innerHTML = drones
        .filter(drone => drone.isFlying)
        .map(drone => `
      <div class="drone-card">
        <h3>Дрон #${drone.id}</h3>
        <p>Высота: ${drone.altitude} м</p>
        <p>Температура: ${drone.temperature} °C</p>
        <p>Давление: ${drone.pressure} гПа</p>
        <button onclick="deleteDrone('${drone.id}')">Удалить дрон</button>
      </div>
    `)
        .join('');
};

// renderer.js
async function deleteDrone(droneId) {
    try {
        const response = await fetch(`http://localhost:3000/delete/${droneId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            document.querySelectorAll('.drone-card h3').forEach(element => {
                if (element.textContent.includes(`Дрон #${droneId}`)) {
                    element.closest('.drone-card').remove();
                }
            });
        }
    } catch (err) {
        console.error('Сетевая ошибка:', err);
    }
}