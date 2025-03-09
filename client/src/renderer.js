let currentDroneName = null;

function createDroneCard(drone) {
    if (!drone || !drone.name) {
        console.error('Некорректные данные дрона:', drone);
        return document.createElement('div');
    }

    const li = document.createElement('li');
    li.className = 'drone-item';
    li.innerHTML = `
        <div class="drone-header">
            <span class="drone-name">${drone.name}</span>
            <div class="actions">
                <button class="edit" onclick="event.stopPropagation(); editDrone('${drone.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
                <button class="delete" onclick="event.stopPropagation(); deleteDrone('${drone.name}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="drone-details">
            <div class="detail-row">
                <span>Модель:</span>
                <span class="model">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Вес:</span>
                <span class="weight">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Макс. высота:</span>
                <span class="max-height">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Макс. температура:</span>
                <span class="max-temp">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Макс. давление:</span>
                <span class="max-pressure">Загрузка...</span>
            </div>
        </div>
    `;

    li.addEventListener('click', async function (event) {
        if (!event.target.closest('.actions')) {
            const wasActive = this.classList.contains('active');

            document.querySelectorAll('.drone-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.drone-details').style.maxHeight = null;
            });

            if (!wasActive) {
                this.classList.add('active');
                const details = this.querySelector('.drone-details');
                await loadDroneDetails(drone.name, this);
                details.style.maxHeight = `${details.scrollHeight}px`;
            }
        }
    });

    return li;
}

async function loadDroneDetails(droneName, element) {
    try {
        const detailsContainer = element.querySelector('.drone-details');
        if (!detailsContainer) return;

        const setContent = (selector, text) => {
            const el = detailsContainer.querySelector(selector);
            if (el) el.textContent = text;
        };

        const response = await fetch(`http://localhost:3000/drones/${encodeURIComponent(droneName)}`);
        if (!response.ok) throw new Error('Ошибка загрузки данных');

        const data = await response.json();

        setContent('.model', data.model || '-');
        setContent('.weight', data.weight ? `${data.weight} кг` : '-');
        setContent('.max-height', data.max_height ? `${data.max_height} м` : '-');
        setContent('.max-temp', data.max_temperature ? `${data.max_temperature} °C` : '-');
        setContent('.max-pressure', data.max_altitude ? `${data.max_altitude} гПа` : '-');

    } catch (error) {
        console.error('Ошибка загрузки деталей:', error);
        const errorEl = element.querySelector('.error-message') || document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = `Ошибка: ${error.message}`;

        const details = element.querySelector('.drone-details');
        if (details) {
            details.innerHTML = '';
            details.appendChild(errorEl);
        }
    }
}

async function renderDrones() {
    const droneList = document.querySelector('.drone-list');
    if (!droneList) return;

    try {
        const response = await fetch('http://localhost:3000/drones');
        if (!response.ok) throw new Error('Ошибка загрузки');

        const drones = await response.json();
        droneList.innerHTML = '';

        drones.forEach(drone => {
            droneList.appendChild(createDroneCard(drone));
        });
    } catch (error) {
        openModal('Ошибка обновления списка: ' + error.message);
    }
}

function resetState() {
    currentDroneName = null;
}

function focusSearch() {
    document.getElementById('searchInput').focus();
}

function openModal(message) {
    const modal = document.getElementById('modal');

    modal.classList.remove('active', 'closing');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-message">${message}</div>
            <div class="modal-actions">
                <button class="button-success" onclick="closeModal()">OK</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        modal.classList.add('active');
    }, 50);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('closing');

    setTimeout(() => {
        modal.classList.remove('active', 'closing');
        modal.innerHTML = '';
    }, 300);
}

function closeModalWithAnimation(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('closing');

    setTimeout(() => {
        modal.classList.remove('active', 'closing');
        modal.innerHTML = '';
    }, 300);
}

// Управление дронами
function toggleStartStop() {
    const startStopButton = document.getElementById('startStopButton');
    const isPlaying = startStopButton.innerHTML.includes('bi-play');

    startStopButton.innerHTML = isPlaying ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
            <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
        </svg>
    ` : `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
            <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
        </svg>
    `;

    startStopButton.style.backgroundColor = isPlaying ? '#dc3545' : '#28a745';
    focusSearch();
}

// Создание дрона
async function openCreateModal() {
    try {
        const response = await fetch('create-drone-modal.html');
        const modalContent = await response.text();

        const modal = document.getElementById('createDroneModal');
        modal.innerHTML = modalContent;

        setTimeout(() => {
            modal.classList.add('active');
            initFormHandlers();
            document.getElementById('name').focus();
        }, 50);

    } catch (error) {
        openModal('Ошибка загрузки формы: ' + error.message);
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createDroneModal');
    modal.classList.add('closing');

    setTimeout(() => {
        modal.classList.remove('active', 'closing');
        modal.innerHTML = '';
        focusSearch();
    }, 300);
    resetState();
}

function initFormHandlers() {
    const form = document.getElementById('droneForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = {
            name: form.querySelector('#name').value.trim(),
            model: form.querySelector('#model').value.trim(),
            weight: parseFloat(form.querySelector('#weight').value),
            max_height: parseFloat(form.querySelector('#max_height').value),
            max_temperature: parseFloat(form.querySelector('#max_temperature').value),
            max_altitude: parseFloat(form.querySelector('#max_altitude').value)
        };

        if (!validateDroneData(formData)) return;

        try {
            const response = await fetch('http://localhost:3000/drones', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Неизвестная ошибка');
            }

            closeCreateModal();
            await renderDrones();
            openModal('Дрон успешно создан!');
        } catch (error) {
            openModal(`Ошибка: ${error.message}`);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    renderDrones();
    document.querySelector('.search-bar button').onclick = openCreateModal;
});

// Удаление дрона
async function deleteDrone(name) {
    currentDroneName = name;
    try {
        const response = await fetch('confirm-delete-modal.html');
        if (!response.ok) throw new Error('Не удалось загрузить форму');

        const modalContent = await response.text();
        const modal = document.getElementById('modal');
        modal.innerHTML = modalContent;

        setTimeout(() => {
            const droneNameElement = document.getElementById('droneName');
            if (droneNameElement) {
                droneNameElement.textContent = name;
                modal.classList.add('active');
            } else {
                throw new Error('Элемент droneName не найден');
            }
        }, 50);

    } catch (error) {
        openModal('Ошибка: ' + error.message);
    }
}

async function confirmDelete() {
    try {
        const response = await fetch(`http://localhost:3000/drones/${currentDroneName}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Ошибка удаления');

        const modal = document.getElementById('modal');
        modal.classList.add('closing');

        await new Promise(resolve => setTimeout(resolve, 300));

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-message">Дрон успешно удалён!</div>
                <div class="modal-actions">
                    <button class="button-success" onclick="closeModal()">OK</button>
                </div>
            </div>
        `;

        modal.classList.remove('closing', 'active');
        setTimeout(() => {
            modal.classList.add('active');
        }, 50);

        await renderDrones();

    } catch (error) {
        openModal(`Ошибка: ${error.message}`);
    } finally {
        currentDroneName = null;
    }
}

function closeDeleteModal() {
    closeModalWithAnimation('modal', () => {
        currentDroneName = null;
    });
}

// Редактирование дрона
async function editDrone(name) {
    try {
        const checkResponse = await fetch(`http://localhost:3000/drones/${name}`);
        if (!checkResponse.ok) throw new Error('Дрон не существует');
    } catch (error) {
        openModal('Дрон не найден в системе');
        return;
    }

    currentDroneName = name;
    try {
        const response = await fetch(`http://localhost:3000/drones/${encodeURIComponent(name)}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Дрон не найден');
        }
        const drone = await response.json();

        const modalResponse = await fetch('edit-drone-modal.html');
        const modalContent = await modalResponse.text();

        const modal = document.getElementById('createDroneModal');
        modal.innerHTML = modalContent;

        setTimeout(() => {
            document.getElementById('editingDroneName').textContent = drone.name;
            document.getElementById('edit_name').value = drone.name;
            document.getElementById('edit_model').value = drone.model;
            document.getElementById('edit_weight').value = drone.weight;
            document.getElementById('edit_max_height').value = drone.max_height;
            document.getElementById('edit_max_temperature').value = drone.max_temperature;
            document.getElementById('edit_max_altitude').value = drone.max_altitude;

            modal.classList.add('active');
            initEditFormHandlers();
        }, 50);

    } catch (error) {
        openModal(`Ошибка: ${error.message}`);
    }
}

function initEditFormHandlers() {
    const form = document.getElementById('editDroneForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
                newName: form.querySelector('#edit_name').value.trim(),
                model: form.querySelector('#edit_model').value.trim(),
                weight: parseFloat(form.querySelector('#edit_weight').value),
                max_height: parseFloat(form.querySelector('#edit_max_height').value),
                max_temperature: parseFloat(form.querySelector('#edit_max_temperature').value),
                max_altitude: parseFloat(form.querySelector('#edit_max_altitude').value)
            };

            if (!validateDroneData(formData)) return;


            const response = await fetch(`http://localhost:3000/drones/${currentDroneName}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Ошибка обновления');

            closeEditModal();

            openModal('Данные дрона успешно обновлены!');
            await renderDrones();
        } catch (error) {
            openModal(`Ошибка: ${error.message}`);
        }
    };
}

function closeEditModal() {
    closeModalWithAnimation('createDroneModal', () => {
        currentDroneName = null;
    });
}

function validateDroneData(data) {
    const errors = [];

    if (!data.newName && data.newName !== undefined) errors.push('• Укажите новое название дрона');
    if (!data.model) errors.push('• Укажите модель дрона');
    if (isNaN(data.weight) || data.weight <= 0) errors.push('• Некорректный вес');
    if (isNaN(data.max_height) || data.max_height <= 0) errors.push('• Некорректная максимальная высота');
    if (isNaN(data.max_temperature)) errors.push('• Некорректная температура');
    if (isNaN(data.max_altitude) || data.max_altitude <= 0) errors.push('• Некорректное давление');

    if (errors.length > 0) {
        openModal('Исправьте ошибки:\n' + errors.join('\n'));
        return false;
    }
    return true;
}

const stubFunctions = [
    'saveData', 'moveLeft',
    'moveForward', 'moveBackward', 'moveRight',
    'decreaseAltitude', 'increaseAltitude',
    'showFlights', 'showSettings'
];

stubFunctions.forEach(funcName => {
    window[funcName] = (...args) => {
        console.log(`Функция ${funcName} вызвана с аргументами:`, args);
        openModal('свага тут?');
    };
});


// переключение темы
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
}
initTheme();