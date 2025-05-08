let currentDroneName = null;
let x = 0;
let y = 0;
let speedX = 0;
let speedY = 0;
let isFlying = false;
let path = [{x: 0, y: 0}];

let smoothedOscillation = 0;
const OSCILLATION_SMOOTHING_FACTOR = 0.5; // Коэффициент сглаживания (0.1 = 10% нового значения, 90% старого)

let isLanded = false;                 // Отслеживает, приземлен ли дрон (для кнопки посадки/взлета)
let lastAltitudeBeforeLanding = 250;  // Хранит последнюю высоту перед посадкой, по умолчанию - высота взлета
const INITIAL_TAKEOFF_ALTITUDE = 250; // Константа для высоты взлета

// Константы для расчетов
let heightAboveSeaLevel = 0;
const P0 = 101325.0;  // Давление на уровне моря (Па)
const T0 = 288.15;    // Температура на уровне моря (К)
const L = -0.0065;    // Температурный градиент (К/м)
const g = 9.80665;    // Ускорение свободного падения (м/с²)
const M = 0.0289644;  // Молярная масса воздуха (кг/моль)
const R = 8.3144598;  // Универсальная газовая постоянная (Дж/(моль·К))

// Глобальные переменные для хранения настроек
let appSettings = {
    heightAboveSea: 0,
    targetAltitude: INITIAL_TAKEOFF_ALTITUDE,
    lastUpdated: null
};

// Глобальные переменные для данных графиков
let altitude = 0;
let time = 0;
let altitudeData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    line: {color: '#28a745', width: 2}
};

let temperatureData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    line: {color: '#ff7f0e', width: 2}
};

let pressureData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    line: {color: '#d62728', width: 2}
};

let targetAltitude = INITIAL_TAKEOFF_ALTITUDE;
const BASE_ASCENT_RATE = 5.0;  // Увеличим базовую скорость для более быстрого взлета на 250м
const BASE_DESCENT_RATE = 4.0; // Базовая скорость снижения (м/с)
const PASSIVE_OSCILLATION_AMPLITUDE = 1.5; // Амплитуда пассивных колебаний (±1.5 метра)
const PASSIVE_OSCILLATION_FREQUENCY = 0.5; // Частота пассивных колебаний (в Гц, влияет на скорость)
const PLOTLY_UPDATE_INTERVAL = 10; // Обновлять Plotly не чаще чем раз в 100 мс
let lastPlotlyUpdate = 0; // Для ограничения частоты обновления Plotly

// Флаг активного изменения высоты (взлет/посадка/смена высоты)
let isAltitudeChanging = false;

// Интервал обновления для requestAnimationFrame (примерно 60 FPS)
const GRAPH_WINDOW_SIZE = 300; // Секунды

const style = document.createElement('style');
style.textContent = `
    .modebar {
        opacity: 0;
transition: opacity 0.2s ease;
    }
    .plot-container:hover .modebar {
        opacity: 1;
}
`;
document.head.appendChild(style);

const plotlyConfig = {
    displayModeBar: true,
    scrollZoom: true,
    modeBarButtonsToRemove: [],
    displaylogo: false,
    responsive: true
};

// Карточка дрона
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
                <span>Мин. температура:</span>
        <span class="max-temp">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Мин. давление:</span>
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
        setContent('.max-pressure', data.max_altitude ? `${data.max_altitude} гПа` : '-'); // Уточнить семантику поля max_altitude
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
    if (isFlying) {
        toggleStartStop();
    }
    clearGraphs(true);
}

function focusSearch() {
    document.getElementById('searchInput').focus();
}

function openModal(message) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.remove('active', 'closing');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-message">${message}</div>
            <div class="modal-actions">
                <button class="button-success" onclick="closeModal()">OK</button>
            </div>
        </div>
    `;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    setTimeout(() => {
        modal.classList.add('active');
    }, 50);
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.remove('active', 'closing');
        modal.innerHTML = '';
    }, 300);
}

function closeModalWithAnimation(modalId, callback = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.remove('active', 'closing');
        modal.innerHTML = '';
        if (callback) callback();
    }, 300);
}

// Создание дрона
async function openCreateModal() {
    try {
        const response = await fetch('create-drone-modal.html');
        if (!response.ok) throw new Error(`Не удалось загрузить create-drone-modal.html: ${response.statusText}`);
        const modalContent = await response.text();

        const modal = document.getElementById('createDroneModal');
        if (!modal) throw new Error("Элемент #createDroneModal не найден");
        modal.innerHTML = modalContent;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        setTimeout(() => {
            modal.classList.add('active');
            initFormHandlers();
            document.getElementById('name')?.focus();
        }, 50);
    } catch (error) {
        openModal('Ошибка загрузки формы: ' + error.message);
    }
}

function closeCreateModal() {
    closeModalWithAnimation('createDroneModal', () => {
        focusSearch();
        resetState();
    });
}

function initFormHandlers() {
    const form = document.getElementById('droneForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = {
            name: form.querySelector('#name')?.value.trim() || '',
            model: form.querySelector('#model')?.value.trim() || '',
            weight: parseFloat(form.querySelector('#weight')?.value) || 0,
            max_height: parseFloat(form.querySelector('#max_height')?.value) || 0,
            max_temperature: parseFloat(form.querySelector('#max_temperature')?.value) || 0,
            max_altitude: parseFloat(form.querySelector('#max_altitude')?.value) || 0
        };
        if (!validateDroneData({...formData, newName: formData.name}, true)) return;

        try {
            const response = await fetch('http://localhost:3000/drones', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({error: 'Неизвестная ошибка сервера'}));
                throw new Error(error.error || `Ошибка ${response.status}`);
            }

            closeCreateModal();
            await renderDrones();
            openModal('Дрон успешно создан!');
        } catch (error) {
            openModal(`Ошибка создания дрона: ${error.message}`);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // renderDrones(); // Загрузка дронов теперь в loadDrones() ниже
    const createButton = document.querySelector('.search-bar button');
    if (createButton) {
        createButton.onclick = openCreateModal;
    }
});

// Удаление дрона
async function deleteDrone(name) {
    currentDroneName = name;
    try {
        const response = await fetch('confirm-delete-modal.html');
        if (!response.ok) throw new Error('Не удалось загрузить форму подтверждения удаления');
        const modalContent = await response.text();
        const modal = document.getElementById('modal');
        if (!modal) throw new Error("Элемент #modal не найден");
        modal.innerHTML = modalContent;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        setTimeout(() => {
            const droneNameElement = document.getElementById('droneName');
            if (droneNameElement) {
                droneNameElement.textContent = name;
                modal.classList.add('active');

                const confirmBtn = modal.querySelector('#confirmDeleteBtn');
                const cancelBtn = modal.querySelector('#cancelDeleteBtn');
                if (confirmBtn) confirmBtn.onclick = confirmDelete;
                if (cancelBtn) cancelBtn.onclick = closeDeleteModal;
            } else {
                throw new Error('Элемент #droneName не найден в confirm-delete-modal.html');
            }
        }, 50);
    } catch (error) {
        openModal('Ошибка: ' + error.message);
    }
}

async function confirmDelete() {
    if (!currentDroneName) return;
    try {
        const response = await fetch(`http://localhost:3000/drones/${encodeURIComponent(currentDroneName)}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({error: 'Ошибка удаления на сервере'}));
            throw new Error(error.error || `Ошибка ${response.status}`);
        }

        closeModalWithAnimation('modal', async () => {
            openModal('Дрон успешно удалён!');
            await renderDrones();
            resetState();
        });
    } catch (error) {
        openModal(`Ошибка удаления: ${error.message}`);
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
        const checkResponse = await fetch(`http://localhost:3000/drones/${encodeURIComponent(name)}`);
        if (!checkResponse.ok) {
            if (checkResponse.status === 404) {
                openModal('Дрон с таким именем больше не существует. Возможно, он был удален.');
                await renderDrones();
                return;
            } else {
                const error = await checkResponse.json().catch(() => ({error: 'Неизвестная ошибка сервера'}));
                throw new Error(error.error || `Ошибка ${checkResponse.status}`);
            }
        }
        const drone = await checkResponse.json();

        currentDroneName = name;

        const modalResponse = await fetch('edit-drone-modal.html');
        if (!modalResponse.ok) throw new Error('Не удалось загрузить форму редактирования');
        const modalContent = await modalResponse.text();

        const modal = document.getElementById('createDroneModal');
        if (!modal) throw new Error("Элемент #createDroneModal не найден");
        modal.innerHTML = modalContent;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        setTimeout(() => {
            document.getElementById('editingDroneName').textContent = drone.name;
            document.getElementById('edit_name').value = drone.name;
            document.getElementById('edit_model').value = drone.model || '';
            document.getElementById('edit_weight').value = drone.weight || '';
            document.getElementById('edit_max_height').value = drone.max_height || '';
            document.getElementById('edit_max_temperature').value = drone.max_temperature || '';
            document.getElementById('edit_max_altitude').value = drone.max_altitude || '';

            modal.classList.add('active');
            initEditFormHandlers();
            document.getElementById('edit_name')?.focus();
        }, 50);
    } catch (error) {
        openModal(`Ошибка при открытии редактирования: ${error.message}`);
        currentDroneName = null;
    }
}

function initEditFormHandlers() {
    const form = document.getElementById('editDroneForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentDroneName) {
            openModal("Ошибка: Не выбрано имя дрона для редактирования.");
            return;
        }
        try {
            const formData = {
                newName: form.querySelector('#edit_name')?.value.trim() || '',
                model: form.querySelector('#edit_model')?.value.trim() || '',
                weight: parseFloat(form.querySelector('#edit_weight')?.value) || 0,
                max_height: parseFloat(form.querySelector('#edit_max_height')?.value) || 0,
                max_temperature: parseFloat(form.querySelector('#edit_max_temperature')?.value) || 0,
                max_altitude: parseFloat(form.querySelector('#edit_max_altitude')?.value) || 0
            };
            if (!validateDroneData(formData, false)) return;

            const response = await fetch(`http://localhost:3000/drones/${encodeURIComponent(currentDroneName)}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({error: 'Ошибка обновления на сервере'}));
                throw new Error(error.error || `Ошибка ${response.status}`);
            }

            closeEditModal();
            await renderDrones();
            openModal('Данные дрона успешно обновлены!');
        } catch (error) {
            openModal(`Ошибка обновления: ${error.message}`);
        }
    };
}

function closeEditModal() {
    closeModalWithAnimation('createDroneModal', () => {
        currentDroneName = null;
    });
}

// Валидация
function validateDroneData(data, isCreate = false) {
    const errors = [];
    const nameToCheck = isCreate ? data.name : data.newName;

    if (!nameToCheck) errors.push('• Укажите название дрона');
    if (!data.model) errors.push('• Укажите модель дрона');
    if (isNaN(data.weight) || data.weight <= 0) errors.push('• Некорректный вес (должен быть > 0)');
    if (isNaN(data.max_height) || data.max_height <= 0) errors.push('• Некорректная макс. высота (должна быть > 0)');
    if (isNaN(data.max_temperature)) errors.push('• Некорректная макс. температура (должна быть числом)');
    if (isNaN(data.max_altitude) || data.max_altitude <= 0) errors.push('• Некорректное макс. давление/высота (должно быть > 0)');

    if (errors.length > 0) {
        openModal('Пожалуйста, исправьте ошибки в форме:\n' + errors.join('\n'));
        return false;
    }
    return true;
}

// Переключение темы
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    updateGraphTheme();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // По умолчанию темная тема
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
}

initTheme();

// Фильтрация дронов
function filterDrones() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const searchValue = searchInput.value.toLowerCase();
    const droneItems = document.querySelectorAll('.drone-list .drone-item');
    let found = false;
    droneItems.forEach((item) => {
        const droneName = item.querySelector('.drone-name')?.textContent.toLowerCase() || '';
        const modelElement = item.querySelector('.model');
        const droneModel = modelElement ? modelElement.textContent.toLowerCase() : '';

        if (droneName.includes(searchValue) || (modelElement && droneModel !== 'загрузка...' && droneModel.includes(searchValue))) {
            item.style.display = '';
            found = true;
        } else {
            item.style.display = 'none';
        }
    });
}

// Загрузка дронов при старте
async function loadDrones() {
    try {
        const response = await fetch('http://localhost:3000/drones');
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const drones = await response.json();

        const droneList = document.querySelector('.drone-list');
        if (!droneList) return;
        droneList.innerHTML = '';
        drones.forEach(drone => {
            const droneCard = createDroneCard(drone);
            droneList.appendChild(droneCard);
        });
        filterDrones();
    } catch (error) {
        console.error('Ошибка при загрузке дронов:', error);
        openModal(`Не удалось загрузить список дронов: ${error.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterDrones);
    }
    loadDrones();
});

let altitudeAnimationFrameId = null;// ID для requestAnimationFrame высоты
let droneAnimationFrameId = null;   // ID для requestAnimationFrame позиции

// Переключение старт/стоп полета
function toggleStartStop() {
    const startStopButton = document.getElementById('startStopButton');
    if (!startStopButton) return;

    isFlying = !isFlying;

    if (isFlying) {
        if (altitude <= 0.1) {
            if (isLanded) {
                targetAltitude = appSettings.targetAltitude;
                console.log(`Взлет на ${targetAltitude.toFixed(1)} м`);
                isLanded = false;
                isAltitudeChanging = true;
            } else {
                console.log(`Новый старт с земли, взлет на ${INITIAL_TAKEOFF_ALTITUDE} м`);
                targetAltitude = appSettings.targetAltitude || INITIAL_TAKEOFF_ALTITUDE;
                lastAltitudeBeforeLanding = INITIAL_TAKEOFF_ALTITUDE;
                altitude = 0;
                time = 0;
                x = 0;
                y = 0;
                speedX = 0;
                speedY = 0;
                path = [{x: 0, y: 0}];
                altitudeData.x = [];
                altitudeData.y = [];
                temperatureData.x = [];
                temperatureData.y = [];
                pressureData.x = [];
                pressureData.y = [];
                initMainGraph(true);
                initAltitudeGraph(true);
                initTemperatureGraph(true);
                initPressureGraph(true);
                const initialXRange = [0, GRAPH_WINDOW_SIZE];
                const timeGraphLayoutUpdate = {'xaxis.range': initialXRange};
                Plotly.relayout('altitude-graph', timeGraphLayoutUpdate).catch(e => console.error(e));
                Plotly.relayout('temperature-graph', timeGraphLayoutUpdate).catch(e => console.error(e));
                Plotly.relayout('pressure-graph', timeGraphLayoutUpdate).catch(e => console.error(e));
                isAltitudeChanging = true;
                isLanded = false;
            }
        } else {
            console.log(`Возобновление полета в воздухе на высоте ${altitude.toFixed(1)} м`);
            targetAltitude = altitude;
            isAltitudeChanging = false;
            isLanded = false;
        }

        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
                <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
            </svg>`;
        startStopButton.style.backgroundColor = '#dc3545';

        if (altitudeAnimationFrameId === null) {
            lastAltitudeUpdate = performance.now();
            altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
        }
        if (droneAnimationFrameId === null) {
            lastPositionUpdate = performance.now();
            droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
        }

    } else {
        console.log("Полет на паузе.");
        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
                <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
            </svg>`;
        startStopButton.style.backgroundColor = '#28a745';

        if (altitudeAnimationFrameId !== null) {
            cancelAnimationFrame(altitudeAnimationFrameId);
            altitudeAnimationFrameId = null;
        }
        if (droneAnimationFrameId !== null) {
            cancelAnimationFrame(droneAnimationFrameId);
            droneAnimationFrameId = null;
        }
        speedX = 0;
        speedY = 0;
        isAltitudeChanging = false;
    }
}

// Инициализация или обновления графика
function initOrUpdateGraph(graphId, data, layoutConfig, baseLayout = {}) {
    const graphDiv = document.getElementById(graphId);
    if (!graphDiv) {
        console.error(`Элемент графика с ID "${graphId}" не найден.`);
        return;
    }

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#ddd' : '#333';
    const gridColor = isDark ? '#555' : '#ccc';
    const zeroLineColor = isDark ? '#888' : '#aaa';

    const defaultLayout = {
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        font: {color: textColor, family: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'},
        xaxis: {
            showgrid: true, gridcolor: gridColor, zerolinecolor: zeroLineColor,
            color: textColor, zerolinewidth: 1, gridwidth: 1,
            titlefont: {size: 14},
            tickfont: {size: 12}
        },
        yaxis: {
            showgrid: true, gridcolor: gridColor, zerolinecolor: zeroLineColor,
            color: textColor, zerolinewidth: 1, gridwidth: 1,
            titlefont: {size: 14},
            tickfont: {size: 12}
        },
        title: {
            font: {size: 16}
        },
        margin: {t: 50, b: 60, l: 70, r: 30},
        autosize: true,
        ...baseLayout
    };

    const mergeLayouts = (target, source) => {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                mergeLayouts(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    };

    const finalLayout = mergeLayouts(JSON.parse(JSON.stringify(defaultLayout)), layoutConfig);
    Plotly.react(graphId, data, finalLayout, plotlyConfig).catch(e => console.error(`Plotly error (${graphId}):`, e));
}


// Инициализация графика высоты
function initAltitudeGraph(reset = false) {
    const layoutConfig = {
        title: {text: 'Высота полета'},
        xaxis: {title: {text: 'Время (сек)'}, range: reset ? [0, GRAPH_WINDOW_SIZE] : undefined},
        yaxis: {title: {text: 'Метры'}, autorange: true, rangemode: 'tozero', fixedrange: false},
        dragmode: 'zoom'
    };
    if (reset || !Array.isArray(altitudeData.x)) {
        altitudeData.x = [];
        altitudeData.y = [];
    }
    initOrUpdateGraph('altitude-graph', [altitudeData], layoutConfig);
}

// Инициализация графика температуры
function initTemperatureGraph(reset = false) {
    const layoutConfig = {
        title: {text: 'Температура'},
        xaxis: {title: {text: 'Время (сек)'}, range: reset ? [0, GRAPH_WINDOW_SIZE] : undefined},
        yaxis: {title: {text: '°C'}, autorange: true, fixedrange: false},
        dragmode: 'zoom'
    };
    if (reset || !Array.isArray(temperatureData.x)) {
        temperatureData.x = [];
        temperatureData.y = [];
    }
    initOrUpdateGraph('temperature-graph', [temperatureData], layoutConfig);
}

// Инициализация графика давления
function initPressureGraph(reset = false) {
    const layoutConfig = {
        title: {text: 'Атмосферное давление'},
        xaxis: {title: {text: 'Время (сек)'}, range: reset ? [0, GRAPH_WINDOW_SIZE] : undefined},
        yaxis: {title: {text: 'гПа'}, autorange: true, fixedrange: false},
        dragmode: 'zoom'
    };
    if (reset || !Array.isArray(pressureData.x)) {
        pressureData.x = [];
        pressureData.y = [];
    }
    initOrUpdateGraph('pressure-graph', [pressureData], layoutConfig);
}

// Инициализация основного графика (положения)
function initMainGraph(reset = false) {
    const isDark = document.body.classList.contains('dark-theme');
    const gridColor = isDark ? '#555' : '#ccc'; //
    const zeroLineColor = isDark ? '#888' : '#aaa'; //
    const layoutConfig = {
        title: {text: 'График местоположения'},
        xaxis: {
            title: {text: 'Ось X (м)'},
            range: [-10, 10],
            zerolinecolor: zeroLineColor,
            zerolinewidth: 1.5
        },
        yaxis: {
            title: {text: 'Ось Y (м)'}, //
            range: [-10, 10],
            zerolinecolor: zeroLineColor,
            zerolinewidth: 1.5,
            scaleanchor: "x",
            scaleratio: 1
        },
        shapes: [
            {type: 'line', x0: -1000, y0: 0, x1: 1000, y1: 0, line: {color: gridColor, width: 1}, layer: 'below'},
            {type: 'line', x0: 0, y0: -1000, x1: 0, y1: 1000, line: {color: gridColor, width: 1}, layer: 'below'}
        ], //
        hovermode: 'closest',
        showlegend: false,
        dragmode: 'zoom'
    };

    // currentX и currentY определяют конечное положение маркера текущей позиции
    const currentX = reset || !path || path.length === 0 ? 0 : path[path.length - 1].x; //
    const currentY = reset || !path || path.length === 0 ? 0 : path[path.length - 1].y; //

    // Определяем координаты начальной точки. Если path пустой или это reset, ставим (0,0).
    const startPointX = (reset || !path || path.length === 0) ? 0 : path[0].x;
    const startPointY = (reset || !path || path.length === 0) ? 0 : path[0].y;

    const data = [
        {
            x: [startPointX],
            y: [startPointY],
            type: 'scattergl',
            mode: 'markers',
            marker: {
                color: '#198754',
                size: 10,
                symbol: 'circle'
            },
            name: 'Start Point'
        },
        {
            x: reset ? [] : (path ? path.map(p => p.x) : []),
            y: reset ? [] : (path ? path.map(p => p.y) : []),
            type: 'scattergl',
            mode: 'lines',
            line: {
                color: '#0d6efd',
                width: 1,
                shape: 'spline',
                smoothing: 0.5
            },
            name: 'Path Line'
        },
        {
            x: [currentX],
            y: [currentY],
            type: 'scattergl',
            mode: 'markers',
            marker: {
                color: '#198754',
                size: 10,
                symbol: 'circle'
            },
            name: 'Current Position'
        }
    ];
    initOrUpdateGraph('main-graph', data, layoutConfig);
}

// Обновление темы для всех графиков
function updateGraphTheme() {
    initMainGraph();
    initAltitudeGraph();
    initTemperatureGraph();
    initPressureGraph();
}

let lastPositionUpdate = 0; // Обновление последней позиции
let lastAltitudeUpdate = 0; // Обновление последней высоты
let lastPlotlyUpdateTimeGraphs = 0; // Обновление времени

const PLOTLY_UPDATE_INTERVAL_TIME = 10; // Обновление временных графиков

// Обновление позиции дрона (для requestAnimationFrame)
function updateDronePosition(timestamp) {
    if (!isFlying || droneAnimationFrameId === null) return;

    const deltaTime = (timestamp - lastPositionUpdate) / 1000.0;

    if (deltaTime > 0) {
        const moveStep = 5.0;
        x += speedX * moveStep * deltaTime;
        y += speedY * moveStep * deltaTime;

        const limit = 100;
        x = Math.max(-limit, Math.min(limit, x));
        y = Math.max(-limit, Math.min(limit, y));
        path.push({ x, y });
    }

    lastPositionUpdate = timestamp;

    if (timestamp - lastPlotlyUpdate > PLOTLY_UPDATE_INTERVAL) {
        lastPlotlyUpdate = timestamp;

        // Данные для обновления линии пути
        const pathLineData = {
            x: [path.map(p => p.x)],
            y: [path.map(p => p.y)]
        };

        // Данные для обновления маркера текущей позиции
        const currentPositionMarkerData = {
            x: [[x]], //
            y: [[y]]  //
        };

        Plotly.restyle('main-graph', pathLineData, [1]);
        Plotly.restyle('main-graph', currentPositionMarkerData, [2]);


        const currentLayout = document.getElementById('main-graph').layout;
        const xRange = currentLayout.xaxis.range;
        const yRange = currentLayout.yaxis.range;
        const padding = 10;
        const newXRange = [
            Math.min(x - padding, xRange[0], -padding),
            Math.max(x + padding, xRange[1], padding)
        ];
        const newYRange = [
            Math.min(y - padding, yRange[0], -padding),
            Math.max(y + padding, yRange[1], padding)
        ];
        Plotly.relayout('main-graph', {
            'xaxis.range': newXRange,
            'yaxis.range': newYRange
        });
    }

    droneAnimationFrameId = requestAnimationFrame(updateDronePosition); //
}

// Обновление высоты, температуры, давления (для requestAnimationFrame)
async function updateAltitude(timestamp) {
    if (!isFlying || altitudeAnimationFrameId === null) {
        if (altitudeAnimationFrameId !== null && !isFlying) {
            altitudeAnimationFrameId = null;
        }
        return;
    }

    const deltaTime = (timestamp - lastAltitudeUpdate) / 1000.0;

    if (deltaTime > 0 && deltaTime < 0.5) {
        time += deltaTime;
        let calculatedAltitude = altitude;


        const altitudeDifference = targetAltitude - calculatedAltitude;
        if (Math.abs(altitudeDifference) > 0.1) {
            if (!isAltitudeChanging) isAltitudeChanging = true;

            const proximityFactor = Math.max(0.1, Math.min(1, Math.abs(altitudeDifference) / 50));
            const direction = Math.sign(altitudeDifference);
            const rate = direction > 0 ? BASE_ASCENT_RATE * proximityFactor : BASE_DESCENT_RATE * proximityFactor;
            const change = direction * rate * deltaTime;

            if (Math.abs(change) >= Math.abs(altitudeDifference)) {
                calculatedAltitude = targetAltitude;
                isAltitudeChanging = false;

                if (targetAltitude <= 0.1) {
                    calculatedAltitude = 0;
                    if (!isLanded) {
                        isLanded = true;
                        console.log("Дрон приземлился (достиг targetAltitude <= 0.1).");
                        smoothedOscillation = 0;
                    }
                }

            } else {
                calculatedAltitude += change;
            }
        } else if (isAltitudeChanging) {
            calculatedAltitude = targetAltitude;
            isAltitudeChanging = false;

            if (targetAltitude <= 0.1) {
                calculatedAltitude = 0;
                if (!isLanded) {
                    isLanded = true;
                    console.log("Дрон приземлился (разница < 0.1, targetAltitude <= 0.1).");
                    smoothedOscillation = 0;
                }
            }
        }

        if (!isAltitudeChanging && !isLanded && calculatedAltitude > 0.5) {
            const rawOscillation = PASSIVE_OSCILLATION_AMPLITUDE * Math.sin(2 * Math.PI * PASSIVE_OSCILLATION_FREQUENCY * time);
            smoothedOscillation = smoothedOscillation * (1 - OSCILLATION_SMOOTHING_FACTOR) + rawOscillation * OSCILLATION_SMOOTHING_FACTOR;
            calculatedAltitude += smoothedOscillation;
        } else if (!isAltitudeChanging && !isLanded && calculatedAltitude <= 0.5) {
            smoothedOscillation *= 0.9;
            calculatedAltitude += smoothedOscillation;
        }

        if (calculatedAltitude < 0) {
            calculatedAltitude = 0;
            if (!isLanded && targetAltitude <= 0.1) {
                isLanded = true;
                isAltitudeChanging = false;
                smoothedOscillation = 0;
                console.log("Дрон приземлился (достиг calculatedAltitude < 0).");
            }
        } else {
            if (isLanded && calculatedAltitude > 0.1) {
                isLanded = false;
                console.log("Сброс флага isLanded при взлете с земли.");
            }
        }

        if (isLanded) {
            calculatedAltitude = 0;
            smoothedOscillation = 0;
        }
        altitude = calculatedAltitude;

        const absoluteAltitude = altitude + heightAboveSeaLevel;
        const tempFluctuation = (Math.random() - 0.5) * 0.2;
        const pressureFluctuation = (Math.random() - 0.5) * 0.1;
        const temperature = T0 + L * absoluteAltitude - 273.15 + tempFluctuation;
        const pressureBase = P0 * Math.pow(Math.max(0.001, 1 + (L * absoluteAltitude) / T0), -(g * M) / (R * L));
        const pressure = pressureBase / 100 + pressureFluctuation;

        const currentTime = parseFloat(time.toFixed(1));
        altitudeData.x.push(currentTime);
        altitudeData.y.push(parseFloat(altitude.toFixed(2)));
        temperatureData.x.push(currentTime);
        temperatureData.y.push(parseFloat(temperature.toFixed(2)));
        pressureData.x.push(currentTime);
        pressureData.y.push(parseFloat(pressure.toFixed(2)));

        if (timestamp - lastPlotlyUpdateTimeGraphs > PLOTLY_UPDATE_INTERVAL_TIME) {
            lastPlotlyUpdateTimeGraphs = timestamp;

            const lastTime = altitudeData.x[altitudeData.x.length - 1];
            const lastAlt = altitudeData.y[altitudeData.y.length - 1];
            const lastTemp = temperatureData.y[temperatureData.y.length - 1];
            const lastPress = pressureData.y[pressureData.y.length - 1];

            if (lastTime !== undefined) {
                const updateAlt = { x: [[lastTime]], y: [[lastAlt]] };
                const updateTemp = { x: [[lastTime]], y: [[lastTemp]] };
                const updatePress = { x: [[lastTime]], y: [[lastPress]] };

                Plotly.extendTraces('altitude-graph', updateAlt, [0]);
                Plotly.extendTraces('temperature-graph', updateTemp, [0]);
                Plotly.extendTraces('pressure-graph', updatePress, [0]);
            }

            const altitudeGraphDiv = document.getElementById('altitude-graph');
            if (altitudeGraphDiv && altitudeGraphDiv.layout) {
                const currentXRange = altitudeGraphDiv.layout.xaxis.range || [0, GRAPH_WINDOW_SIZE];
                const lastAddedTime = altitudeData.x[altitudeData.x.length - 1];

                if (lastAddedTime !== undefined && lastAddedTime > currentXRange[1]) {
                    const timeWindowStart = lastAddedTime - GRAPH_WINDOW_SIZE;
                    const newXRange = [timeWindowStart, lastAddedTime];
                    const layoutUpdate = {'xaxis.range': newXRange};
                    try {
                        await Plotly.relayout('altitude-graph', layoutUpdate);
                        await Plotly.relayout('temperature-graph', layoutUpdate);
                        await Plotly.relayout('pressure-graph', layoutUpdate);
                    } catch(e) { console.error("Relayout error time:", e); }
                } else if (currentXRange[0] !== 0 && lastAddedTime !== undefined && lastAddedTime <= GRAPH_WINDOW_SIZE) {
                    const initialXRange = [0, GRAPH_WINDOW_SIZE];
                    const layoutUpdate = {'xaxis.range': initialXRange};
                    try {
                        await Plotly.relayout('altitude-graph', layoutUpdate);
                        await Plotly.relayout('temperature-graph', layoutUpdate);
                        await Plotly.relayout('pressure-graph', layoutUpdate);
                    } catch(e) { console.error("Relayout error time reset:", e); }
                }
            }
        }
        lastAltitudeUpdate = timestamp;
    }

    if (isFlying) {
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    } else {
        altitudeAnimationFrameId = null;
    }
}

// Функции управления высотой
// Увеличение высоты
function increaseAltitude() {
    if (!isFlying) return;

    if (isLanded) {
        console.log("Increase altitude pressed while landed. Initiating takeoff.");
        toggleLandTakeoff();
        return;
    }

    const currentTarget = isAltitudeChanging ? targetAltitude : altitude;

    const step = Math.max(1, Math.round(currentTarget / 100)); // Шаг = 1 метр на каждые 100м высоты (минимум 1)
    const altitudeIncrement = Math.min(50, step); // Ограничиваем максимальный шаг (например, 50м)
    targetAltitude = Math.min(currentTarget + altitudeIncrement, 10000); // Увеличиваем цель на рассчитанный шаг
    console.log(`Increasing altitude. Current: ${altitude.toFixed(1)}, Current Target: ${currentTarget.toFixed(1)}, New Target: ${targetAltitude.toFixed(1)}, Step: ${altitudeIncrement}`);

    isAltitudeChanging = true;

    if (altitudeAnimationFrameId === null && isFlying) {
        console.log("Restarting altitude update loop from increaseAltitude");
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
}

// Уменьшение высоты
function decreaseAltitude() {
    if (!isFlying) return;

    if (isLanded) {
        console.log("Cannot decrease altitude: Already landed.");
        return;
    }

    const currentTarget = isAltitudeChanging ? targetAltitude : altitude;

    const step = Math.max(1, Math.round(currentTarget / 100));
    const altitudeDecrement = Math.min(50, step);
    targetAltitude = Math.max(currentTarget - altitudeDecrement, 0);
    console.log(`Decreasing altitude. Current: ${altitude.toFixed(1)}, Current Target: ${currentTarget.toFixed(1)}, New Target: ${targetAltitude.toFixed(1)}, Step: ${altitudeDecrement}`);

    isAltitudeChanging = true; // Начинаем/продолжаем изменение

    if (altitudeAnimationFrameId === null && isFlying) {
        console.log("Restarting altitude update loop from decreaseAltitude");
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
}

// Функция посадки/взлёта
function toggleLandTakeoff() {
    if (!isFlying) {
        console.log("Cannot toggle land/takeoff: Not flying.");
        return;
    }

    if (isLanded) {
        console.log("Attempting takeoff from landed state...");
        targetAltitude = lastAltitudeBeforeLanding > 1 ? lastAltitudeBeforeLanding : INITIAL_TAKEOFF_ALTITUDE;
        isLanded = false; // Важно! Сбросить флаг ПЕРЕД перезапуском циклов
        isAltitudeChanging = true;
        console.log(`Takeoff initiated. Target altitude: ${targetAltitude.toFixed(1)} m`);

        if (isFlying) {
            if (altitudeAnimationFrameId === null) {
                console.log("Requesting altitude frame on takeoff.");
                lastAltitudeUpdate = performance.now();
                altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
            }
            if (droneAnimationFrameId === null) {
                console.log("Requesting position frame on takeoff.");
                lastPositionUpdate = performance.now();
                droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
            }
        } else {
            console.warn("Takeoff initiated but isFlying is false?");
        }
    } else {
        console.log("Attempting landing...");
        if (altitude > 0.1) {
            lastAltitudeBeforeLanding = altitude;
        } else {
            lastAltitudeBeforeLanding = INITIAL_TAKEOFF_ALTITUDE;
        }
        targetAltitude = 0;
        isAltitudeChanging = true;
        console.log("Landing initiated.");
        if (altitudeAnimationFrameId === null && isFlying) {
            console.log("Requesting altitude frame on landing.");
            lastAltitudeUpdate = performance.now();
            altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
        }
    }
}

// Очистка графиков
function clearGraphs(confirmed = false) {
    if (!confirmed) {
        showClearConfirmation();
        return;
    }

    // Остановка полета и анимаций
    if (isFlying) {
        isFlying = false;
    }

    // Отменяем анимации
    if (altitudeAnimationFrameId !== null) cancelAnimationFrame(altitudeAnimationFrameId);
    if (droneAnimationFrameId !== null) cancelAnimationFrame(droneAnimationFrameId);
    altitudeAnimationFrameId = null;
    droneAnimationFrameId = null;

    // Сброс параметров состояния
    x = 0;
    y = 0;
    speedX = 0;
    speedY = 0;
    altitude = 0;
    targetAltitude = INITIAL_TAKEOFF_ALTITUDE;
    isLanded = false;
    lastAltitudeBeforeLanding = INITIAL_TAKEOFF_ALTITUDE;
    time = 0;
    path = [{x: 0, y: 0}];
    isAltitudeChanging = false;

    // Очистка данных графиков
    altitudeData.x = [];
    altitudeData.y = [];
    temperatureData.x = [];
    temperatureData.y = [];
    pressureData.x = [];
    pressureData.y = [];

    // Переинициализация графиков с параметром reset = true
    initMainGraph(true);
    initAltitudeGraph(true);
    initTemperatureGraph(true);
    initPressureGraph(true);

    // Обновление кнопки Start/Stop в состояние Start
    const startStopButton = document.getElementById('startStopButton');
    if (startStopButton) {
        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
                <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
            </svg>`;
        startStopButton.style.backgroundColor = '#28a745';
    }

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);
}

// Функции подтверждения очистки
function showClearConfirmation() {
    const modal = document.getElementById('modal');
    if (!modal) return;

    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">Подтверждение очистки</h3>
            <div class="modal-message">Вы уверены, что хотите остановить полет и очистить все графики? Это действие необратимо.</div>
            <div class="modal-actions">
                <button class="cancel-btn" onclick="handleClearConfirmation(false)">Отмена</button>
                <button class="confirm-btn" onclick="handleClearConfirmation(true)">Очистить</button>
            </div>
        </div>`;

    modal.classList.add('active');

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function handleClearConfirmation(confirmed) {
    closeModalWithAnimation('modal', () => {
        if (confirmed) {
            clearGraphs(true);
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {

    initMainGraph(true);
    initAltitudeGraph(true);
    initTemperatureGraph(true);
    initPressureGraph(true);

    const startStopBtn = document.getElementById('startStopButton');
    if (startStopBtn) startStopBtn.onclick = toggleStartStop;

    const landBtn = document.getElementById('landButton');
    if (landBtn) landBtn.onclick = toggleLandTakeoff;

    const clearBtn = document.getElementById('clearButton');
    if (clearBtn) clearBtn.onclick = () => clearGraphs(false);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            ['main-graph', 'altitude-graph', 'temperature-graph', 'pressure-graph'].forEach(graphId => {
                const graphDiv = document.getElementById(graphId);
                if (graphDiv && typeof graphDiv.layout !== 'undefined') {
                    Plotly.Plots.resize(graphDiv).catch(e => console.error(`Resize error ${graphId}:`, e));
                }
            });
        }, 150);
    });

    const themeToggleButton = document.getElementById('themeToggle');
    if (themeToggleButton) {
        themeToggleButton.onclick = toggleTheme;
    }

    const setupMovementButton = (id, action) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('mousedown', action);
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                action();
            });
        }
    };
    setupMovementButton('moveForward', moveForward);
    setupMovementButton('moveBackward', moveBackward);
    setupMovementButton('moveLeft', moveLeft);
    setupMovementButton('moveRight', moveRight);

    const stopMovement = () => {
        if (isFlying) {
            speedX = 0;
            speedY = 0;
        }
    };
    const stopEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];
    ['moveForward', 'moveBackward', 'moveLeft', 'moveRight'].forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            stopEvents.forEach(event => button.addEventListener(event, stopMovement));
        }
    });

    document.getElementById('increaseAltitudeBtn')?.addEventListener('click', increaseAltitude);
    document.getElementById('decreaseAltitudeBtn')?.addEventListener('click', decreaseAltitude);

    updateGraphTheme();
});

// Движение дрона на графике
function moveForward() {
    if (isFlying && !isLanded) speedY = 1;
}

function moveBackward() {
    if (isFlying && !isLanded) speedY = -1;
}

function moveLeft() {
    if (isFlying && !isLanded) speedX = -1;
}

function moveRight() {
    if (isFlying && !isLanded) speedX = 1;
}

// Обработчики нажатия и отпускания клавиш
document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.repeat) {
        return;
    }

    // Управление движением и высотой если летит и не приземлен
    if (isFlying && !isLanded) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                speedY = 1;
                break;
            case 'KeyS':
            case 'ArrowDown':
                speedY = -1;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                speedX = -1;
                break;
            case 'KeyD':
            case 'ArrowRight':
                speedX = 1;
                break;
            case 'KeyE':
                increaseAltitude();
                break; // Подъем
            case 'KeyQ':
                decreaseAltitude();
                break; // Снижение
        }
    }

    switch (event.code) {
        case 'Space':
            event.preventDefault();
            toggleStartStop();
            break;
        case 'KeyL':
            event.preventDefault();
            toggleLandTakeoff();
            break;
        case 'KeyR':
            event.preventDefault();
            clearGraphs(false);
            break;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
        case 'KeyS':
        case 'ArrowDown':
            if (speedY !== 0) speedY = 0;
            break;
        case 'KeyA':
        case 'ArrowLeft':
        case 'KeyD':
        case 'ArrowRight':
            if (speedX !== 0) speedX = 0;
            break;
    }
});

// Окно настроек
function showSettings() {
    let modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('active');
        return;
    }

    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'settingsModal';
    document.body.appendChild(modal);

    fetch('settings-modal.html')
        .then(response => response.text())
        .then(html => {
            modal.innerHTML = html;

            updateSettingsFields();

            setupSettingsInputHandlers();

            setTimeout(() => modal.classList.add('active'), 10);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeSettingsModal();
            });
        })
        .catch(error => {
            console.error('Error loading settings modal:', error);
            modal.innerHTML = `<div class="modal-content"><p>Error loading settings: ${error.message}</p></div>`;
            modal.classList.add('active');
        });
}

function calculateAtmosphericParams() {
    const absoluteAltitude = heightAboveSeaLevel;
    const temperature = T0 + L * absoluteAltitude - 273.15;
    const pressure = P0 * Math.pow(1 + (L * absoluteAltitude) / T0, -(g * M) / (R * L)) / 100;

    return {
        temperature: temperature.toFixed(1),
        pressure: pressure.toFixed(1)
    };
}

function updateSettingsFields() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    const heightInput = modal.querySelector('#height_above_sea');
    const targetAltInput = modal.querySelector('#target_altitude');

    if (heightInput && targetAltInput) {
        heightInput.value = appSettings.heightAboveSea;
        targetAltInput.value = appSettings.targetAltitude;
        updateCalculatedValues();
    }
}

function updateCalculatedValues() {
    const height = parseFloat(document.getElementById('height_above_sea').value) || 0;

    const temperature = T0 + L * height - 273.15;
    const pressure = P0 * Math.pow(1 + (L * height) / T0, -(g * M) / (R * L)) / 100;

    document.getElementById('calculated_temperature').value = temperature.toFixed(1);
    document.getElementById('calculated_pressure').value = pressure.toFixed(1);
}

function setupSettingsInputHandlers() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    const initialHeight = appSettings.heightAboveSea;
    const initialAltitude = appSettings.targetAltitude;

    const heightInput = modal.querySelector('#height_above_sea');
    const targetAltInput = modal.querySelector('#target_altitude');
    const saveBtn = modal.querySelector('#saveSettingsBtn');
    const cancelBtn = modal.querySelector('.button-danger');
    const defaultsBtn = modal.querySelector('.defaults-btn');

    if (!heightInput || !targetAltInput || !saveBtn || !cancelBtn || !defaultsBtn) {
        console.error('One or more settings elements not found');
        return;
    }

    heightInput.addEventListener('input', function() {
        const value = parseFloat(this.value) || 0;
        appSettings.heightAboveSea = value;
        updateCalculatedValues();
    });

    targetAltInput.addEventListener('input', function() {
        const value = parseFloat(this.value) || 0;
        appSettings.targetAltitude = value;
        updateCalculatedValues();
    });

    saveBtn.addEventListener('click', function() {
        heightAboveSeaLevel = appSettings.heightAboveSea;
        targetAltitude = appSettings.targetAltitude;
        appSettings.lastUpdated = new Date();

        if (isFlying) {
            updateAltitudeData();
        }
        closeSettingsModal();
    });

    cancelBtn.addEventListener('click', function() {
        appSettings.heightAboveSea = initialHeight;
        appSettings.targetAltitude = initialAltitude;
        closeSettingsModal();
    });

    defaultsBtn.addEventListener('click', function() {
        appSettings.heightAboveSea = 0;
        appSettings.targetAltitude = INITIAL_TAKEOFF_ALTITUDE;
        updateSettingsFields();
    });
}

function updateAltitudeData() {
    const absoluteAltitude = heightAboveSeaLevel + altitude;
    const params = calculateAtmosphericParams();

    if (altitudeData.y.length > 0) {
        const lastIndex = altitudeData.y.length - 1;
        temperatureData.y[lastIndex] = parseFloat(params.temperature);
        pressureData.y[lastIndex] = parseFloat(params.pressure);

        Plotly.restyle('temperature-graph', {y: [temperatureData.y]}, [0]);
        Plotly.restyle('pressure-graph', {y: [pressureData.y]}, [0]);
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}