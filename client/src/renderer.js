function focusSearch() {
    document.getElementById('searchInput').focus();
}

function openModal(message) {
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = message;

    modal.classList.remove('closing');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('closing');

    setTimeout(() => {
        modal.classList.remove('active', 'closing');
        focusSearch();
    }, 300);
}

function toggleStartStop() {
    const startStopButton = document.getElementById('startStopButton');
    if (startStopButton.innerHTML.includes('bi-play')) {
        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
                <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
            </svg>
        `;
        startStopButton.style.backgroundColor = '#dc3545';
    } else {
        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
                <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
            </svg>
        `;
        startStopButton.style.backgroundColor = '#28a745';
    }
    focusSearch();
}

function deleteDrone(droneName) {
    openModal(`Удалить дрон: ${droneName}`);
}

function editDrone(droneName) {
    openModal(`Редактировать дрон: ${droneName}`);
}

function saveData() {
    openModal('Данные сохранены!');
}

function moveLeft() {
    openModal('Двигаемся влево...');
}

function moveForward() {
    openModal('Двигаемся вперёд...');
}

function moveBackward() {
    openModal('Двигаемся назад...');
}

function moveRight() {
    openModal('Двигаемся вправо...');
}

function decreaseAltitude() {
    openModal('Уменьшаем высоту...');
}

function increaseAltitude() {
    openModal('Увеличиваем высоту...');
}

function showFlights() {
    openModal('Открыть раздел "Полёты"');
}

function showSettings() {
    openModal('Открыть раздел "Параметры"');
}