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
let lastAltitudeBeforeLanding = 3;  // Хранит последнюю высоту перед посадкой, по умолчанию - высота взлета
const INITIAL_TAKEOFF_ALTITUDE = 3; // Константа для высоты взлета

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
    lastUpdated: null,
    voronoiPoints: [],
    cellularEndPoint: {x: null, y: null},
    circleRadius: 50,
    squareDimension: 32
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

let warningsTriggered = {
    altitude: false,
    temperature: false,
    pressure: false
};

let targetAltitude = INITIAL_TAKEOFF_ALTITUDE;
const BASE_ASCENT_RATE = 5.0;  // базовая скорость для более быстрого взлета на 250м
const BASE_DESCENT_RATE = 4.0; // Базовая скорость снижения (м/с)
const PLOTLY_UPDATE_INTERVAL = 10; // Обновлять Plotly не чаще чем раз в 100 мс
let lastPlotlyUpdate = 0; // Для ограничения частоты обновления Plotly

let altitudeAnimationFrameId = null;
let droneAnimationFrameId = null;

// Флаг активного изменения высоты (взлет/посадка/смена высоты)
let isAltitudeChanging = false;

// Интервал обновления для requestAnimationFrame (примерно 60 FPS)
const GRAPH_WINDOW_SIZE = 300; // Секунды

const plotlyConfig = {
    displayModeBar: true,
    scrollZoom: true,
    modeBarButtonsToRemove: [],
    displaylogo: false,
    responsive: true
};

let isSquareModeActive = false;
let N_default_init = appSettings.squareDimension;
squarePathCoordinates = [
    { x: -N_default_init, y: N_default_init },
    { x: -N_default_init, y: -N_default_init },
    { x: N_default_init, y: -N_default_init },
    { x: N_default_init, y: N_default_init }
];

let currentSquarePathIndex = 0;
let isFlyingSquarePath = false;
const SQUARE_PATH_SPEED = 10;
let droneReachedTargetAltitudeForSquarePath = false;
let controlAltitude = 0;    // опорная высота, по ней считаем посадку/взлёт и флаги
let SQUARE_START_POINT = { x: 0, y: appSettings.squareDimension }; // Начальная точка (0, N)
let isApproachingSquareStartPoint = false;

let isCircleModeActive = false;
let isFlyingCirclePath = false;
let droneReachedTargetAltitudeForCirclePath = false;
let CIRCLE_RADIUS = appSettings.circleRadius;
const CIRCLE_ANGULAR_SPEED = Math.PI / 10;
let currentCircleAngle = 0;

let isApproachingCircleStart = false; // Это верно, когда активен режим круга и дрон должен долететь до начальной точки круга
let currentCircleApproachTarget = null; // Сохраняет цель {x, y} для фазы сближения в режиме круга
const CIRCLE_APPROACH_SPEED = 10; // Скорость приближения к начальной точке круга, аналогичная скорости SQUARE_PATH_SPEED

let dronePathBeforeLanding = null; // Сохраняет состояние дрона (местоположение, высоту, особенности режима) перед началом посадки в режиме квадрата /круга.
let isReturningToPathAfterLandingCancel = false; // True если посадка была отменена в специальном режиме и беспилотник возвращается на прежнюю траекторию полета
let landingSequenceActiveInMode = false; // True если последовательность посадки (полет до 0,0 и снижение) активна в режиме квадрата или круга
let isPathPausedForLanding = false; // True если необходимо приостановить выполнение обычной траектории (движение по квадрату/кругу) (например, во время приземления).

let isVoronoiModeActive = false;
let voronoiPathCoordinates = [];
let currentVoronoiPathIndex = 0;
let isFlyingVoronoiPath = false;
const VORONOI_PATH_SPEED = 10;
let droneReachedTargetAltitudeForVoronoiPath = false;
let voronoiReturnToOriginAfterCycle = false;
let voronoiTargetingOrigin = {x: 0, y: 0};

let isCellularDecompositionModeActive = false;
let cellularEndPoint = {x: null, y: null};
let cellularObstacles = [];
let cellularPathCoordinates = []; // Путь к концу
let cellularReturnPathCoordinates = []; // Путь назад
let currentCellularPathIndex = 0;
let isFlyingCellularPath = false;
let droneReachedTargetAltitudeForCellularPath = false;
let isReturningToStartCellular = false; // Флаг
const CELL_OBSTACLE_SIZE = 5; // 5x5 метров

let lastPositionUpdate = 0;
let lastAltitudeUpdate = 0;
let lastPlotlyUpdateTimeGraphs = 0;

const PLOTLY_UPDATE_INTERVAL_TIME = 10;

let selectedDroneDetails = null;
let altitudeIndicator, temperatureIndicator, pressureIndicator;

let isSimulationActive = false;

let allFlightsData = null;

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
        <span class="max-altitude">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Мин. температура:</span>
        <span class="min-temperature">Загрузка...</span>
            </div>
            <div class="detail-row">
                <span>Мин. давление:</span>
        <span class="min-pressure">Загрузка...</span>
            </div>
        </div>
    `;
    li.addEventListener('click', async function (event) {
        if (isSimulationActive) {
            openModal('Смена дрона невозможна во время моделирования. Очистите графики для сброса.');
            return;
        }
        if (!event.target.closest('.actions')) {
            const wasActive = this.classList.contains('active');

            document.querySelectorAll('.drone-item').forEach(item => {
                item.classList.remove('active');
                item.querySelector('.drone-details').style.maxHeight = null;
            });

            if (!wasActive) {
                this.classList.add('active');
                const detailsElement = this.querySelector('.drone-details');
                await loadDroneDetails(drone.name, this);
                detailsElement.style.maxHeight = `${detailsElement.scrollHeight}px`;

                currentDroneName = drone.name;
                try {
                    const response = await fetch(`http://localhost:3000/drones/${encodeURIComponent(drone.name)}`);
                    if (response.ok) {
                        selectedDroneDetails = await response.json();
                        console.log('Selected drone:', currentDroneName, selectedDroneDetails);
                        resetIndicators();
                    } else {
                        selectedDroneDetails = null;
                        console.error('Could not fetch details for selected drone:', drone.name);
                    }
                } catch (error) {
                    selectedDroneDetails = null;
                    console.error('Error fetching details for selected drone:', error);
                }

            } else {
                this.classList.remove('active');
                this.querySelector('.drone-details').style.maxHeight = null;
                currentDroneName = null;
                selectedDroneDetails = null;
                console.log('Drone deselected');
                resetIndicators();
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
        setContent('.max-altitude', data.max_altitude ? `${data.max_altitude} м` : '-');
        setContent('.min-temperature', data.min_temperature ? `${data.min_temperature} °C` : '-');
        setContent('.min-pressure', data.min_pressure ? `${data.min_pressure} гПа` : '-');

        if (currentDroneName === droneName) {
            selectedDroneDetails = data;
        }

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
        if (currentDroneName === droneName) {
            selectedDroneDetails = null;
        }
    }
}

function checkAndUpdateIndicators(currentAltitude, currentFlightTemperature, currentFlightPressure) {
    if (!selectedDroneDetails) {
        resetIndicators();
        return;
    }

    if (!altitudeIndicator) altitudeIndicator = document.getElementById('indicator-altitude');
    if (!temperatureIndicator) temperatureIndicator = document.getElementById('indicator-temperature');
    if (!pressureIndicator) pressureIndicator = document.getElementById('indicator-pressure');

    if (!altitudeIndicator || !temperatureIndicator || !pressureIndicator) {
        return;
    }

    let blinkAltitude = false;
    let blinkTemperature = false;
    let blinkPressure = false;

    if (typeof selectedDroneDetails.max_altitude === 'number' && currentAltitude > selectedDroneDetails.max_altitude) {
        blinkAltitude = true;
        warningsTriggered.altitude = true;
    }

    if (typeof selectedDroneDetails.min_temperature === 'number' && currentFlightTemperature < selectedDroneDetails.min_temperature) {
        blinkTemperature = true;
        warningsTriggered.temperature = true;
    }
    if (typeof selectedDroneDetails.min_pressure === 'number' && currentFlightPressure < selectedDroneDetails.min_pressure) {
        blinkPressure = true;
        warningsTriggered.pressure = true;
    }

    altitudeIndicator.classList.toggle('blinking', blinkAltitude);
    temperatureIndicator.classList.toggle('blinking', blinkTemperature);
    pressureIndicator.classList.toggle('blinking', blinkPressure);
}

function resetIndicators() {
    if (altitudeIndicator) altitudeIndicator.classList.remove('blinking');
    if (temperatureIndicator) temperatureIndicator.classList.remove('blinking');
    if (pressureIndicator) pressureIndicator.classList.remove('blinking');
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
    if (isSimulationActive) {
        console.warn('Настройки недоступны во время моделирования');
        return;
    }
    const modal = document.getElementById('modal');
    if (!modal) return;
    document.body.appendChild(modal);
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
    if (isSimulationActive) {
        openModal('Настройки недоступны во время моделирования');
        return;
    }
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
            max_altitude: parseFloat(form.querySelector('#max_altitude')?.value) || 0,
            min_temperature: parseFloat(form.querySelector('#min_temperature')?.value) || 0,
            min_pressure: parseFloat(form.querySelector('#min_pressure')?.value) || 0
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
    const createButton = document.querySelector('.search-bar button');
    if (createButton) {
        createButton.onclick = openCreateModal;
    }
});

// Удаление дрона
async function deleteDrone(name) {
    if (isSimulationActive) {
        openModal('Настройки недоступны во время моделирования');
        return;
    }
    currentDroneName = name;
    try {
        const response = await fetch('confirm-delete-drone-modal.html');
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
    if (isSimulationActive) {
        openModal('Настройки недоступны во время моделирования');
        return;
    }
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
            document.getElementById('edit_max_altitude').value = drone.max_altitude || '';
            document.getElementById('edit_min_temperature').value = drone.min_temperature || '';
            document.getElementById('edit_min_pressure').value = drone.min_pressure || '';

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
                max_altitude: parseFloat(form.querySelector('#edit_max_altitude')?.value) || 0,
                min_temperature: parseFloat(form.querySelector('#edit_min_temperature')?.value) || 0,
                min_pressure: parseFloat(form.querySelector('#edit_min_pressure')?.value) || 0
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
    if (isNaN(data.max_altitude) || data.max_altitude <= 0) errors.push('• Некорректная макс. высота (должна быть > 0)');
    if (isNaN(data.min_temperature)) errors.push('• Некорректная макс. температура (должна быть числом)');
    if (isNaN(data.min_pressure) || data.min_pressure <= 0) errors.push('• Некорректное макс. давление/высота (должно быть > 0)');

    if (errors.length > 0) {
        openModal('Пожалуйста, исправьте ошибки в форме:\n' + errors.join('\n'));
        return false;
    }
    return true;
}

// Переключение темы
function toggleTheme() {
    if (isSimulationActive) {
        openModal('Настройки недоступны во время моделирования');
        return;
    }
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    updateGraphTheme();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
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

// Блокировка элементов интерфейса во время моделирования
function updateUIState() {
    const disabled = isSimulationActive;

    document.querySelectorAll('.drone-item').forEach(item => {
        item.style.pointerEvents = disabled ? 'none' : 'auto';
        item.style.opacity = disabled ? '0.6' : '1';
    });

    const toDisableButtons = [
        '#theme-button',
        '#settings-button',
        '#flights-button',
        '.search-bar button'
    ];

    const keepEnabledButtons = [
        '#startStopButton',
        '#landButton',
        '#increaseAltitudeBtn',
        '#decreaseAltitudeBtn',
        '#clearButton',
        '#saveDataButton'
    ];

    toDisableButtons.forEach(selector => {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.disabled = disabled;
            btn.classList.toggle('disabled-ui', disabled);
        }
    });

    keepEnabledButtons.forEach(selector => {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('disabled-ui');
        }
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.disabled = disabled;
        if (!disabled) searchInput.value = '';
        searchInput.classList.toggle('disabled-ui', disabled);
    }

    document.querySelectorAll('.drone-item .actions button').forEach(btn => {
        btn.disabled = disabled;
        btn.classList.toggle('disabled-ui', disabled);
    });
}

function toggleStartStop() {
    const startStopButton = document.getElementById('startStopButton');
    if (!startStopButton) return;

    if (!isFlying && !currentDroneName) {
        openModal('Пожалуйста, выберите дрон перед запуском моделирования.');
        return;
    }

    isFlying = !isFlying;
    isSimulationActive = isFlying || (!isFlying && currentDroneName);
    updateUIState();

    if (isFlying) {
        if (altitude <= 0.1) {
            warningsTriggered = {altitude: false, temperature: false, pressure: false};
            if (isLanded) {
                targetAltitude = appSettings.targetAltitude;
                console.log(`Взлет на ${targetAltitude.toFixed(1)} м (с ранее приземленного состояния)`);
                isLanded = false;
                isAltitudeChanging = true;

                if (isSquareModeActive) {
                    currentSquarePathIndex = 0;
                    isFlyingSquarePath = false;
                    droneReachedTargetAltitudeForSquarePath = false;
                    x = 0;
                    y = 0;
                    if (path.length === 0 || path[path.length - 1].x !== 0 || path[path.length - 1].y !== 0) path = [{
                        x: 0,
                        y: 0
                    }];
                }
                if (isCircleModeActive) {
                    isApproachingCircleStart = true;
                    currentCircleApproachTarget = null;
                    isFlyingCirclePath = false;
                    currentCircleAngle = 0;
                    droneReachedTargetAltitudeForCirclePath = false;
                    x = 0;
                    y = 0;
                    if (path.length === 0 || path[path.length - 1].x !== 0 || path[path.length - 1].y !== 0) path = [{
                        x: 0,
                        y: 0
                    }];
                }
                if (isVoronoiModeActive) {
                    currentVoronoiPathIndex = 0;
                    isFlyingVoronoiPath = false;
                    droneReachedTargetAltitudeForVoronoiPath = false;
                    x = 0;
                    y = 0;
                    voronoiPathCoordinates = JSON.parse(JSON.stringify(appSettings.voronoiPoints));
                    if (path.length === 0 || path[path.length - 1].x !== 0 || path[path.length - 1].y !== 0) path = [{
                        x: 0,
                        y: 0
                    }];
                }
                if (isCellularDecompositionModeActive) {
                    currentCellularPathIndex = 0;
                    isFlyingCellularPath = false;
                    droneReachedTargetAltitudeForCellularPath = false;
                    isReturningToStartCellular = false;
                    cellularPathCoordinates = [];
                    cellularReturnPathCoordinates = [];
                    x = 0;
                    y = 0;
                    if (path.length === 0 || path[path.length - 1].x !== 0 || path[path.length - 1].y !== 0) path = [{
                        x: 0,
                        y: 0
                    }];

                    if (!cellularEndPoint || typeof cellularEndPoint.x !== 'number') {
                    }
                    initMainGraph(true);
                }

                isPathPausedForLanding = false;
                landingSequenceActiveInMode = false;
                isReturningToPathAfterLandingCancel = false;
                dronePathBeforeLanding = null;

            } else {
                console.log(`Новый старт с земли, взлет на ${appSettings.targetAltitude || INITIAL_TAKEOFF_ALTITUDE} м`);
                targetAltitude = appSettings.targetAltitude || INITIAL_TAKEOFF_ALTITUDE;
                lastAltitudeBeforeLanding = targetAltitude;
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

                if (isSquareModeActive) {
                    currentSquarePathIndex = 0;
                    isFlyingSquarePath = false;
                    droneReachedTargetAltitudeForSquarePath = false;
                }
                if (isCircleModeActive) {
                    isApproachingCircleStart = true;
                    isFlyingCirclePath = false;
                    currentCircleAngle = 0;
                    droneReachedTargetAltitudeForCirclePath = false;
                }
                if (isVoronoiModeActive) {
                    currentVoronoiPathIndex = 0;
                    isFlyingVoronoiPath = false;
                    droneReachedTargetAltitudeForVoronoiPath = false;
                    voronoiPathCoordinates = JSON.parse(JSON.stringify(appSettings.voronoiPoints));
                }

                if (isCellularDecompositionModeActive) {
                    currentCellularPathIndex = 0;
                    isFlyingCellularPath = false;
                    droneReachedTargetAltitudeForCellularPath = false;
                    isReturningToStartCellular = false;
                    cellularPathCoordinates = [];
                    cellularReturnPathCoordinates = [];
                    if (!cellularEndPoint || typeof cellularEndPoint.x !== 'number') {
                    }
                }
                isPathPausedForLanding = false;
                landingSequenceActiveInMode = false;
                isReturningToPathAfterLandingCancel = false;
                dronePathBeforeLanding = null;
            }
        } else {
            warningsTriggered = {altitude: false, temperature: false, pressure: false};
            console.log(`Возобновление полета в воздухе на высоте ${altitude.toFixed(1)} м`);
            targetAltitude = appSettings.targetAltitude;
            isAltitudeChanging = (Math.abs(altitude - targetAltitude) > 0.5);
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
        resetIndicators();
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
        console.error('Элемент графика с ID "' + graphId + '" не найден.');
        return;
    }

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#dddddd' : '#333333';
    const gridColor = isDark ? '#555555' : '#cccccc';
    const zeroLineColor = isDark ? '#888888' : '#aaaaaa';
    const bgColor = isDark ? '#2e2e2e' : '#ffffff';

    const defaultLayout = {
        plot_bgcolor: bgColor,
        paper_bgcolor: bgColor,
        font: {
            color: textColor,
            family: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        xaxis: {
            showgrid: true,
            gridcolor: gridColor,
            zerolinecolor: zeroLineColor,
            color: textColor,
            zerolinewidth: 1,
            gridwidth: 1,
            titlefont: {size: 14},
            tickfont: {size: 12}
        },
        yaxis: {
            showgrid: true,
            gridcolor: gridColor,
            zerolinecolor: zeroLineColor,
            color: textColor,
            zerolinewidth: 1,
            gridwidth: 1,
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

    function mergeLayouts(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                mergeLayouts(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    const finalLayout = mergeLayouts(JSON.parse(JSON.stringify(defaultLayout)), layoutConfig);

    Plotly.react(graphId, data, finalLayout, plotlyConfig)
        .catch(e => console.error('Ошибка при обновлении графика ' + graphId + ':', e));
}

// Обновление темы для всех графиков
function updateGraphTheme() {
    initMainGraph();
    initAltitudeGraph();
    initTemperatureGraph();
    initPressureGraph();
}

// Функция сохранения графика с учётом текущей темы
function saveGraph(graphId, filename = graphId) {
    const isDark = document.body.classList.contains('dark-theme');
    const bgColor = isDark ? '#2e2e2e' : '#ffffff';
    const layoutUpdate = {
        plot_bgcolor: bgColor,
        paper_bgcolor: bgColor
    };
    const graphDiv = document.getElementById(graphId);
    Plotly.downloadImage(graphDiv, {
        format: 'png',
        filename: filename,
        width: 800,
        height: 600,
        scale: 1,
        layout: layoutUpdate
    });
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
    const gridColor = isDark ? '#555' : '#ccc';
    const zeroLineColor = isDark ? '#888' : '#aaa';

    const layoutConfig = {
        title: {text: 'График местоположения'},
        xaxis: {
            title: {text: 'Ось X (м)'},
            range: [-10, 10],
            zerolinecolor: zeroLineColor,
            zerolinewidth: 1.5
        },
        yaxis: {
            title: {text: 'Ось Y (м)'},
            range: [-10, 10],
            zerolinecolor: zeroLineColor,
            zerolinewidth: 1.5,
            scaleanchor: "x",
            scaleratio: 1
        },
        shapes: [
            {type: 'line', x0: -1000, y0: 0, x1: 1000, y1: 0, line: {color: gridColor, width: 1}, layer: 'below'},
            {type: 'line', x0: 0, y0: -1000, x1: 0, y1: 1000, line: {color: gridColor, width: 1}, layer: 'below'}
        ],
        hovermode: 'closest',
        showlegend: false,
        dragmode: 'zoom'
    };

    const currentXVal = reset || !path || path.length === 0 ? 0 : path[path.length - 1].x;
    const currentYVal = reset || !path || path.length === 0 ? 0 : path[path.length - 1].y;
    const startPointX = (reset || !path || path.length === 0) ? 0 : path[0].x;
    const startPointY = (reset || !path || path.length === 0) ? 0 : path[0].y;

    const data = [
        {
            x: [startPointX],
            y: [startPointY],
            type: 'scattergl',
            mode: 'markers',
            marker: {color: '#198754', size: 10, symbol: 'circle'},
            name: 'Start Point'
        },
        {
            x: reset ? [] : (path ? path.map(p => p.x) : []),
            y: reset ? [] : (path ? path.map(p => p.y) : []),
            type: 'scattergl',
            mode: 'lines',
            line: {color: '#0d6efd', width: 1, shape: 'spline', smoothing: 0.5},
            name: 'Path Line'
        },
        {
            x: [currentXVal],
            y: [currentYVal],
            type: 'scattergl',
            mode: 'markers',
            marker: {color: '#198754', size: 10, symbol: 'circle'},
            name: 'Current Position'
        }
    ];

    if (isCellularDecompositionModeActive) {
        if (cellularEndPoint && typeof cellularEndPoint.x === 'number') {
            data.push({
                x: [cellularEndPoint.x],
                y: [cellularEndPoint.y],
                type: 'scattergl',
                mode: 'markers',
                marker: {color: 'red', size: 12, symbol: 'circle-open-dot'},
                name: 'Cellular End Point'
            });
        }

        cellularObstacles.forEach(obs => {
            layoutConfig.shapes.push({
                type: 'rect',
                x0: obs.x,
                y0: obs.y - obs.height,
                x1: obs.x + obs.width,
                y1: obs.y,
                line: {
                    color: 'rgba(128, 0, 128, 1)',
                    width: 2
                },
                fillcolor: 'rgba(128, 0, 128, 0.3)',
                layer: 'below'
            });
        });
        if (cellularPathCoordinates.length > 0) {
            data.push({
                x: cellularPathCoordinates.map(p => p.x),
                y: cellularPathCoordinates.map(p => p.y),
                type: 'scattergl',
                mode: 'lines',
                line: {color: 'orange', width: 2, dash: 'dot'},
                name: 'Cellular Calculated Path'
            });
        }
    }


    initOrUpdateGraph('main-graph', data, layoutConfig);

    if (isCellularDecompositionModeActive && cellularEndPoint && typeof cellularEndPoint.x === 'number') {
        const allX = [0, cellularEndPoint.x, ...cellularObstacles.map(obs => [obs.x, obs.x + obs.width]).flat()];
        const allY = [0, cellularEndPoint.y, ...cellularObstacles.map(obs => [obs.y - obs.height, obs.y]).flat()];

        const minX = Math.min(...allX) - 10;
        const maxX = Math.max(...allX) + 10;
        const minY = Math.min(...allY) - 10;
        const maxY = Math.max(...allY) + 10;

        const xRange = [minX, maxX];
        const yRange = [minY, maxY];

        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];

        if (xSpan > ySpan) {
            const diff = xSpan - ySpan;
            yRange[0] -= diff / 2;
            yRange[1] += diff / 2;
        } else {
            const diff = ySpan - xSpan;
            xRange[0] -= diff / 2;
            xRange[1] += diff / 2;
        }

        Plotly.relayout('main-graph', {
            'xaxis.range': xRange,
            'yaxis.range': yRange
        }).catch(e => console.error("Ошибка для клеток:", e));
    }
}

// Обновление темы для всех графиков
function updateGraphTheme() {
    initMainGraph();
    initAltitudeGraph();
    initTemperatureGraph();
    initPressureGraph();
}

// Флаг для специального режима Вороного с 2 точками
let voronoiTwoPointReturningToOrigin = false;
let landingInPlaceCellular = false;

// Обновление позиции дрона
function updateDronePosition(timestamp) {
    if (!isFlying || droneAnimationFrameId === null) return;
    const effectiveDeltaTime = (timestamp - lastPositionUpdate) / 1000.0;
    let newX = x;
    let newY = y;
    if (effectiveDeltaTime <= 0) {
        lastPositionUpdate = timestamp;
        droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
        return;
    }

    if (isReturningToPathAfterLandingCancel) {
        if (dronePathBeforeLanding) {
            const targetX_return = dronePathBeforeLanding.x;
            const targetY_return = dronePathBeforeLanding.y;
            const dX_return = targetX_return - newX;
            const dY_return = targetY_return - newY;
            const dist_return = Math.hypot(dX_return, dY_return);
            const speed_return = SQUARE_PATH_SPEED;
            const step_return = speed_return * effectiveDeltaTime;

            if (dist_return <= step_return) {
                newX = targetX_return;
                newY = targetY_return;
                isReturningToPathAfterLandingCancel = false;
                isPathPausedForLanding = false;

                const modeState = dronePathBeforeLanding.modeState;
                if (modeState) {
                    if (modeState.type === 'square') {
                        currentSquarePathIndex = modeState.index;
                        isFlyingSquarePath = modeState.isFlying;
                        droneReachedTargetAltitudeForSquarePath = true;
                    } else if (modeState.type === 'circle') {
                        currentCircleAngle = modeState.angle;
                        isApproachingCircleStart = modeState.isApproaching;
                        currentCircleApproachTarget = modeState.approachTarget;
                        isFlyingCirclePath = modeState.isFlying;
                        droneReachedTargetAltitudeForCirclePath = true;
                    } else if (modeState.type === 'voronoi') {
                        currentVoronoiPathIndex = modeState.index;
                        isFlyingVoronoiPath = modeState.isFlying;
                        voronoiPathCoordinates = JSON.parse(JSON.stringify(modeState.coordinates));
                        droneReachedTargetAltitudeForVoronoiPath = true;
                        voronoiTwoPointReturningToOrigin = modeState.returningToOrigin || false;
                    } else if (modeState.type === 'cells') {
                        cellularPathCoordinates = JSON.parse(JSON.stringify(modeState.path));
                        cellularReturnPathCoordinates = JSON.parse(JSON.stringify(modeState.returnPath));
                        currentCellularPathIndex = modeState.index;
                        isReturningToStartCellular = modeState.isReturning;
                        isFlyingCellularPath = modeState.isFlying;
                        cellularEndPoint = JSON.parse(JSON.stringify(modeState.endPoint));
                        cellularObstacles = JSON.parse(JSON.stringify(modeState.obstacles));
                        droneReachedTargetAltitudeForCellularPath = true;
                        initMainGraph(false);
                    }
                }
                dronePathBeforeLanding = null;
            } else {
                newX += dX_return / dist_return * step_return;
                newY += dY_return / dist_return * step_return;
            }
        } else {
            isReturningToPathAfterLandingCancel = false;
            isPathPausedForLanding = false;
        }
    } else if (landingSequenceActiveInMode && !isReturningToPathAfterLandingCancel && !landingInPlaceCellular) {
        const targetX_land = 0, targetY_land = 0;
        const dX_land = targetX_land - newX;
        const dY_land = targetY_land - newY;
        const dist_land = Math.hypot(dX_land, dY_land);
        const speed_land = SQUARE_PATH_SPEED;
        const step_land = speed_land * effectiveDeltaTime;
        if (dist_land <= step_land) {
            newX = targetX_land;
            newY = targetY_land;
        } else {
            newX += dX_land / dist_land * step_land;
            newY += dY_land / dist_land * step_land;
        }
    } else if (isPathPausedForLanding && landingSequenceActiveInMode && (landingInPlaceCellular || targetAltitude === 0)) {
    } else if (!isPathPausedForLanding && !isLanded) {
        if (isCellularDecompositionModeActive && isFlying && cellularEndPoint && typeof cellularEndPoint.x === 'number') {
            isFlyingCellularPath = true;
            let currentTargetTripPath;
            let finalTargetForTrip;

            if (isReturningToStartCellular) {
                currentTargetTripPath = cellularReturnPathCoordinates;
                finalTargetForTrip = {x: 0, y: 0};
            } else {
                currentTargetTripPath = cellularPathCoordinates;
                finalTargetForTrip = cellularEndPoint;
            }

            if (!currentTargetTripPath || currentTargetTripPath.length === 0) {
                const startCalculationFrom = (isReturningToStartCellular) ?
                    (newX === cellularEndPoint.x && newY === cellularEndPoint.y ? cellularEndPoint : {
                        x: newX,
                        y: newY
                    }) :
                    (newX === 0 && newY === 0 ? {x: 0, y: 0} : {x: newX, y: newY});

                const calculatedPathForTrip = calculateCellularPath(startCalculationFrom, finalTargetForTrip);

                if (calculatedPathForTrip && calculatedPathForTrip.length > 0) {
                    if (isReturningToStartCellular) {
                        cellularReturnPathCoordinates = [...calculatedPathForTrip];
                        currentTargetTripPath = cellularReturnPathCoordinates;
                    } else {
                        cellularPathCoordinates = [...calculatedPathForTrip];
                        currentTargetTripPath = cellularPathCoordinates;
                    }
                    currentCellularPathIndex = 0;
                    initMainGraph(false);
                } else {
                    if (Math.hypot(newX - finalTargetForTrip.x, newY - finalTargetForTrip.y) < 1.0) {
                        if (isReturningToStartCellular) {
                            isReturningToStartCellular = false;
                            currentCellularPathIndex = 0;
                            cellularPathCoordinates = [];
                        } else {
                            isReturningToStartCellular = true;
                            currentCellularPathIndex = 0;
                            cellularReturnPathCoordinates = [];
                        }
                    } else {
                        isFlyingCellularPath = false;
                    }
                }
            }

            if (isFlyingCellularPath && currentTargetTripPath && currentTargetTripPath.length > 0 && currentCellularPathIndex < currentTargetTripPath.length) {
                const targetWaypoint = currentTargetTripPath[currentCellularPathIndex];
                const dX_cell = targetWaypoint.x - newX;
                const dY_cell = targetWaypoint.y - newY;
                const dist_cell = Math.hypot(dX_cell, dY_cell);
                const speed_cell = VORONOI_PATH_SPEED;
                const step_cell = speed_cell * effectiveDeltaTime;

                if (dist_cell <= step_cell) {
                    newX = targetWaypoint.x;
                    newY = targetWaypoint.y;
                    currentCellularPathIndex++;
                    if (currentCellularPathIndex >= currentTargetTripPath.length) {
                        if (isReturningToStartCellular) {
                            isReturningToStartCellular = false;
                            currentCellularPathIndex = 0;
                            cellularPathCoordinates = [];
                        } else {
                            isReturningToStartCellular = true;
                            currentCellularPathIndex = 0;
                            cellularReturnPathCoordinates = [];
                        }
                    }
                } else {
                    newX += dX_cell / dist_cell * step_cell;
                    newY += dY_cell / dist_cell * step_cell;
                }
            }
        } else if (isSquareModeActive && isFlying) {
            if (isApproachingSquareStartPoint) {
                const targetPosApp = SQUARE_START_POINT;
                const dX_sq_app = targetPosApp.x - newX;
                const dY_sq_app = targetPosApp.y - newY;
                const dist_sq_app = Math.hypot(dX_sq_app, dY_sq_app);
                const step_sq_app = SQUARE_PATH_SPEED * effectiveDeltaTime;
                if (dist_sq_app <= step_sq_app || dist_sq_app < 0.1) {
                    newX = targetPosApp.x;
                    newY = targetPosApp.y;
                    isApproachingSquareStartPoint = false;
                    currentSquarePathIndex = 0;
                } else {
                    newX += dX_sq_app / dist_sq_app * step_sq_app;
                    newY += dY_sq_app / dist_sq_app * step_sq_app;
                }
            } else if (squarePathCoordinates && squarePathCoordinates.length > 0) {
                const targetPos = squarePathCoordinates[currentSquarePathIndex];
                const dX_sq = targetPos.x - newX;
                const dY_sq = targetPos.y - newY;
                const dist_sq = Math.hypot(dX_sq, dY_sq);
                const step_sq = SQUARE_PATH_SPEED * effectiveDeltaTime;
                if (dist_sq <= step_sq || dist_sq < 0.1) {
                    newX = targetPos.x;
                    newY = targetPos.y;
                    currentSquarePathIndex++;
                    if (currentSquarePathIndex >= squarePathCoordinates.length) {
                        currentSquarePathIndex = 0;
                    }
                } else {
                    newX += dX_sq / dist_sq * step_sq;
                    newY += dY_sq / dist_sq * step_sq;
                }
            }
        } else if (isCircleModeActive && isFlying) {
            const currentCircleRadiusToUse = appSettings.circleRadius || CIRCLE_RADIUS;
            const dynamicCircleStartPoint = {x: 0, y: currentCircleRadiusToUse};

            if (isApproachingCircleStart) {
                currentCircleApproachTarget = dynamicCircleStartPoint;
                const dX_c_app = currentCircleApproachTarget.x - newX;
                const dY_c_app = currentCircleApproachTarget.y - newY;
                const dist_c_app = Math.hypot(dX_c_app, dY_c_app);
                const step_c_app = CIRCLE_APPROACH_SPEED * effectiveDeltaTime;
                if (dist_c_app <= step_c_app || dist_c_app < 0.1) {
                    newX = currentCircleApproachTarget.x;
                    newY = currentCircleApproachTarget.y;
                    isApproachingCircleStart = false;
                    currentCircleAngle = Math.atan2(newY, newX);
                    if (newX === 0 && newY > 0) currentCircleAngle = Math.PI / 2;
                    else if (newX === 0 && newY < 0) currentCircleAngle = -Math.PI / 2;
                } else {
                    newX += dX_c_app / dist_c_app * step_c_app;
                    newY += dY_c_app / dist_c_app * step_c_app;
                }
            } else {
                const dAngle = CIRCLE_ANGULAR_SPEED * effectiveDeltaTime;
                currentCircleAngle += dAngle;
                newX = currentCircleRadiusToUse * Math.cos(currentCircleAngle);
                newY = currentCircleRadiusToUse * Math.sin(currentCircleAngle);
                if (currentCircleAngle >= (Math.PI * 2)) {
                    currentCircleAngle -= (Math.PI * 2);
                } else if (currentCircleAngle <= -(Math.PI * 2)) {
                    currentCircleAngle += (Math.PI * 2);
                }
            }
        } else if (isVoronoiModeActive && isFlying && voronoiPathCoordinates.length > 0) {
            isFlyingVoronoiPath = true;
            let targetPos;

            if (voronoiReturnToOriginAfterCycle) {
                targetPos = voronoiTargetingOrigin;
            } else if (voronoiTwoPointReturningToOrigin && voronoiPathCoordinates.length === 2) {
                targetPos = voronoiTargetingOrigin;
            } else {
                targetPos = voronoiPathCoordinates[currentVoronoiPathIndex];
            }

            const dX_v = targetPos.x - newX;
            const dY_v = targetPos.y - newY;
            const dist_v = Math.hypot(dX_v, dY_v);
            const step_v = VORONOI_PATH_SPEED * effectiveDeltaTime;

            if (dist_v <= step_v) {
                newX = targetPos.x;
                newY = targetPos.y;

                if (voronoiReturnToOriginAfterCycle) {
                    voronoiReturnToOriginAfterCycle = false;
                    currentVoronoiPathIndex = 0;
                } else if (voronoiTwoPointReturningToOrigin && voronoiPathCoordinates.length === 2) {
                    voronoiTwoPointReturningToOrigin = false;
                    currentVoronoiPathIndex = 0;
                } else {
                    currentVoronoiPathIndex++;
                    if (currentVoronoiPathIndex >= voronoiPathCoordinates.length) {
                        if (voronoiPathCoordinates.length === 2) {
                            voronoiTwoPointReturningToOrigin = true;
                        } else {
                            voronoiReturnToOriginAfterCycle = true;
                        }
                    } else {
                    }
                }
            } else {
                newX += dX_v / dist_v * step_v;
                newY += dY_v / dist_v * step_v;
            }
        } else if (!(isSquareModeActive || isCircleModeActive || isVoronoiModeActive || isCellularDecompositionModeActive)) {
            const moveStep = 5.0;
            newX += speedX * moveStep * effectiveDeltaTime;
            newY += speedY * moveStep * effectiveDeltaTime;
            const limit = 1000;
            newX = Math.max(-limit, Math.min(limit, newX));
            newY = Math.max(-limit, Math.min(limit, newY));
        }
    }

    x = newX;
    y = newY;
    const lastPathPoint = path.length > 0 ? path[path.length - 1] : null;
    if (!lastPathPoint || Math.abs(lastPathPoint.x - x) > 0.01 || Math.abs(lastPathPoint.y - y) > 0.01) {
        path.push({x, y});
    }

    lastPositionUpdate = timestamp;
    if (timestamp - lastPlotlyUpdate > PLOTLY_UPDATE_INTERVAL) {
        lastPlotlyUpdate = timestamp;
        const pathLineData = {x: [path.map(p => p.x)], y: [path.map(p => p.y)]};
        const currentPositionMarkerData = {x: [[x]], y: [[y]]};
        Plotly.restyle('main-graph', pathLineData, [1]).catch(e => console.error("Ошибка рестайла пути:", e));
        Plotly.restyle('main-graph', currentPositionMarkerData, [2]).catch(e => console.error("Ошибка маркера позиции:", e));

        if (isCellularDecompositionModeActive) {
            const currentVisPath = isReturningToStartCellular ? cellularReturnPathCoordinates : cellularPathCoordinates;
            if (currentVisPath && currentVisPath.length > 0) {
                const graphElement = document.getElementById('main-graph');
                let actualCellularTraceIndex = -1;
                if (graphElement && graphElement.data) {
                    for (let i = 0; i < graphElement.data.length; i++) {
                        if (graphElement.data[i].name === 'Cellular Calculated Path') {
                            actualCellularTraceIndex = i;
                            break;
                        }
                    }
                }
                if (actualCellularTraceIndex !== -1) {
                    Plotly.restyle('main-graph', {
                        x: [currentVisPath.map(p => p.x)],
                        y: [currentVisPath.map(p => p.y)]
                    }, [actualCellularTraceIndex]).catch(e => {
                    });
                }
            }
        }

        const mainGraphDiv = document.getElementById('main-graph');
        if (mainGraphDiv && mainGraphDiv.layout && mainGraphDiv.layout.xaxis && mainGraphDiv.layout.yaxis) {
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
    }
    droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
}

// Обновление высоты
async function updateAltitude(timestamp) {
    if (!isFlying || altitudeAnimationFrameId === null) {
        if (altitudeAnimationFrameId !== null && !isFlying) {
            cancelAnimationFrame(altitudeAnimationFrameId);
            altitudeAnimationFrameId = null;
        }
        return;
    }

    if (isSquareModeActive) {
        if (!droneReachedTargetAltitudeForSquarePath && !isAltitudeChanging && !isLanded && Math.abs(altitude - targetAltitude) < 0.5) {
            droneReachedTargetAltitudeForSquarePath = true;
        }
    }
    if (isCircleModeActive) {
        if (!droneReachedTargetAltitudeForCirclePath && !isAltitudeChanging && !isLanded && Math.abs(altitude - targetAltitude) < 0.5) {
            droneReachedTargetAltitudeForCirclePath = true;
        }
    }
    if (isVoronoiModeActive) {
        if (!droneReachedTargetAltitudeForVoronoiPath && !isAltitudeChanging && !isLanded && Math.abs(altitude - targetAltitude) < 0.5) {
            droneReachedTargetAltitudeForVoronoiPath = true;
        }
    }
    if (isCellularDecompositionModeActive) {
        if (!droneReachedTargetAltitudeForCellularPath && !isAltitudeChanging && !isLanded && Math.abs(altitude - targetAltitude) < 0.5) {
            droneReachedTargetAltitudeForCellularPath = true;
            cellularPathCoordinates = [];
            cellularReturnPathCoordinates = [];
            currentCellularPathIndex = 0;
        }
    }


    const deltaTime = (timestamp - lastAltitudeUpdate) / 1000.0;
    if (deltaTime > 0 && deltaTime < 0.5) {
        time += deltaTime;
        const diff = targetAltitude - controlAltitude;

        if (Math.abs(diff) > 0.1) {
            if (!isAltitudeChanging && !isLanded) isAltitudeChanging = true;

            const factor = Math.max(0.1, Math.min(1, Math.abs(diff) / 50));
            const dir = Math.sign(diff);
            const rate = dir > 0 ? (BASE_ASCENT_RATE * factor) : (BASE_DESCENT_RATE * factor);
            let step = dir * rate * deltaTime;

            if (Math.abs(step) >= Math.abs(diff)) {
                controlAltitude = targetAltitude;
                isAltitudeChanging = false;
                if (targetAltitude <= 0.1 && !isLanded) {
                    isLanded = true;
                    controlAltitude = 0;
                    altitude = 0;
                    console.log("Дрон приземлился.");
                    if (landingSequenceActiveInMode) {
                    }
                }
            } else {
                controlAltitude += step;
            }
        } else if (isAltitudeChanging) {
            controlAltitude = targetAltitude;
            isAltitudeChanging = false;
            if (targetAltitude <= 0.1 && !isLanded) {
                isLanded = true;
                controlAltitude = 0;
                altitude = 0;
                console.log("Дрон приземлился (snapped).");
                if (landingSequenceActiveInMode) {
                }
            }
        }

        if (controlAltitude < 0) controlAltitude = 0;

        if (isLanded) {
            controlAltitude = 0;
            altitude = 0;
            smoothedOscillation = 0;
        }

        if (!isAltitudeChanging && !isLanded && !landingSequenceActiveInMode && !isReturningToPathAfterLandingCancel) {
            const minAlt = 5,
                maxAlt = 1000;
            const minAmp = 0.1,
                maxAmp = 0.5;

            let noiseAmp = minAmp;
            if (controlAltitude > minAlt) {
                noiseAmp = minAmp + (maxAmp - minAmp) * Math.min(1, (controlAltitude - minAlt) / (maxAlt - minAlt));
            }
            const rawNoise = (Math.random() * 2 - 1) * noiseAmp;
            smoothedOscillation = smoothedOscillation * (1 - OSCILLATION_SMOOTHING_FACTOR) +
                rawNoise * OSCILLATION_SMOOTHING_FACTOR;
        } else {
            smoothedOscillation = 0;
        }

        if (!isLanded) {
            altitude = controlAltitude + smoothedOscillation;
            if (altitude < 0) altitude = 0;
        } else {
            altitude = 0;
        }

        const absoluteAlt = altitude + heightAboveSeaLevel;
        const tempFluct = (Math.random() - 0.5) * 0.2;
        const pressFluct = (Math.random() - 0.5) * 0.1;
        const temperature = T0 + L * absoluteAlt - 273.15 + tempFluct;
        const pressureBase = P0 * Math.pow(
            Math.max(0.001, 1 + (L * absoluteAlt) / T0),
            -(g * M) / (R * L)
        );
        const pressure = pressureBase / 100 + pressFluct;
        if (isFlying && !isLanded) {
            const currentFlightAltitude = parseFloat(altitude.toFixed(2));
            const currentFlightTemperature = parseFloat(temperature.toFixed(2));
            const currentFlightPressure = parseFloat(pressure.toFixed(2));

            checkAndUpdateIndicators(currentFlightAltitude, currentFlightTemperature, currentFlightPressure);
        } else {
            resetIndicators();
        }

        const t_graph = parseFloat(time.toFixed(1));
        altitudeData.x.push(t_graph);
        altitudeData.y.push(parseFloat(altitude.toFixed(2)));
        temperatureData.x.push(t_graph);
        temperatureData.y.push(parseFloat(temperature.toFixed(2)));
        pressureData.x.push(t_graph);
        pressureData.y.push(parseFloat(pressure.toFixed(2)));

        if (timestamp - lastPlotlyUpdateTimeGraphs > PLOTLY_UPDATE_INTERVAL_TIME) {
            lastPlotlyUpdateTimeGraphs = timestamp;
            const i = altitudeData.x.length - 1;
            if (i >= 0) {
                Plotly.extendTraces('altitude-graph', {
                    x: [
                        [altitudeData.x[i]]
                    ],
                    y: [
                        [altitudeData.y[i]]
                    ]
                }, [0]);
                Plotly.extendTraces('temperature-graph', {
                    x: [
                        [temperatureData.x[i]]
                    ],
                    y: [
                        [temperatureData.y[i]]
                    ]
                }, [0]);
                Plotly.extendTraces('pressure-graph', {
                    x: [
                        [pressureData.x[i]]
                    ],
                    y: [
                        [pressureData.y[i]]
                    ]
                }, [0]);
            }

            const gd_alt_div = document.getElementById('altitude-graph');
            if (gd_alt_div && gd_alt_div.layout && gd_alt_div.layout.xaxis) {
                const current_alt_layout = gd_alt_div.layout;
                const range_alt = current_alt_layout.xaxis.range || [0, GRAPH_WINDOW_SIZE];
                const lastT_alt = i >= 0 ? altitudeData.x[i] : 0;

                if (lastT_alt > range_alt[1]) {
                    const newR_alt = [lastT_alt - GRAPH_WINDOW_SIZE + (PLOTLY_UPDATE_INTERVAL_TIME / 1000), lastT_alt + (PLOTLY_UPDATE_INTERVAL_TIME / 1000)];
                    await Plotly.relayout('altitude-graph', {
                        'xaxis.range': newR_alt
                    });
                    await Plotly.relayout('temperature-graph', {
                        'xaxis.range': newR_alt
                    });
                    await Plotly.relayout('pressure-graph', {
                        'xaxis.range': newR_alt
                    });
                } else if (range_alt[0] !== 0 && lastT_alt <= GRAPH_WINDOW_SIZE && lastT_alt > (range_alt[1] - range_alt[0]) / 2) {
                    if (range_alt[0] > 0 && altitudeData.x[altitudeData.x.length - 1] < GRAPH_WINDOW_SIZE && altitudeData.x[0] < GRAPH_WINDOW_SIZE) {
                        const init_alt = [0, GRAPH_WINDOW_SIZE];
                        await Plotly.relayout('altitude-graph', {
                            'xaxis.range': init_alt
                        });
                        await Plotly.relayout('temperature-graph', {
                            'xaxis.range': init_alt
                        });
                        await Plotly.relayout('pressure-graph', {
                            'xaxis.range': init_alt
                        });
                    }
                }
            }
        }
        lastAltitudeUpdate = timestamp;
    }

    altitudeAnimationFrameId = isFlying ?
        requestAnimationFrame(updateAltitude) :
        null;
}

function increaseAltitude() {
    if (!isFlying && !isLanded) return;

    if (isLanded && !isFlying) {
        _initiateTakeoff(false);
        const altitudeIncrement = getDynamicAltitudeStep(INITIAL_TAKEOFF_ALTITUDE);
        targetAltitude = INITIAL_TAKEOFF_ALTITUDE + altitudeIncrement;
        targetAltitude = Math.min(targetAltitude, 10000);
        appSettings.targetAltitude = targetAltitude;
        isAltitudeChanging = true;
        return;
    }

    isLanded = false;
    const currentActualAltitude = altitude;
    const altitudeIncrement = getDynamicAltitudeStep(currentActualAltitude);

    targetAltitude = Math.min(currentActualAltitude + altitudeIncrement, 10000);

    appSettings.targetAltitude = targetAltitude;
    isAltitudeChanging = true;

    if (altitudeAnimationFrameId === null && isFlying) {
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
}

function decreaseAltitude() {
    if (!isFlying) return;
    if (isLanded && targetAltitude <= 0.1) {
        return;
    }

    const currentActualAltitude = altitude;
    const altitudeDecrement = getDynamicAltitudeStep(currentActualAltitude);

    let newCalculatedTargetAltitude = Math.max(currentActualAltitude - altitudeDecrement, 0);

    if (newCalculatedTargetAltitude <= 0.1 && currentActualAltitude > 0.1 && !isLanded) {
        lastAltitudeBeforeLanding = altitude;
    }

    targetAltitude = newCalculatedTargetAltitude;
    appSettings.targetAltitude = targetAltitude;
    isAltitudeChanging = true;

    if (targetAltitude <= 0.1 && !isLanded) {
    }

    if (altitudeAnimationFrameId === null && isFlying) {
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
}

function getDynamicAltitudeStep(currentAlt) {
    if (currentAlt < 10) return 1;
    if (currentAlt < 50) return 2;
    if (currentAlt < 100) return 5;
    if (currentAlt < 250) return 10;
    if (currentAlt < 500) return 20;
    return 50;
}

// Функция посадки/взлёта
function toggleLandTakeoff() {
    if (!isFlying && !isLanded) {
        _initiateTakeoff(false);
        return;
    }
    if (!isFlying && isLanded) {
        _initiateTakeoff(false);
        return;
    }

    if (isLanded) {
        isLanded = false;
        isAltitudeChanging = true;
        landingInPlaceCellular = false;
        landingSequenceActiveInMode = false;
        isPathPausedForLanding = false;

        if (dronePathBeforeLanding && dronePathBeforeLanding.altitudeBeforeLanding > 0.1) {
            targetAltitude = dronePathBeforeLanding.altitudeBeforeLanding;
            isReturningToPathAfterLandingCancel = true;
        } else {
            targetAltitude = appSettings.targetAltitude || INITIAL_TAKEOFF_ALTITUDE;
            if (isSquareModeActive) {
                currentSquarePathIndex = 0;
                x = 0;
                y = 0;
                path = [{x: 0, y: 0}];
            }
            if (isCircleModeActive) {
                isApproachingCircleStart = true;
                currentCircleAngle = 0;
                x = 0;
                y = 0;
                path = [{x: 0, y: 0}];
            }
            if (isVoronoiModeActive) {
                currentVoronoiPathIndex = 0;
                x = 0;
                y = 0;
                path = [{x: 0, y: 0}];
                voronoiPathCoordinates = JSON.parse(JSON.stringify(appSettings.voronoiPoints));
                voronoiTwoPointReturningToOrigin = false;
            }
            if (isCellularDecompositionModeActive) {
                currentCellularPathIndex = 0;
                isReturningToStartCellular = false;
                cellularPathCoordinates = [];
                cellularReturnPathCoordinates = [];
                x = 0;
                y = 0;
                path = [{x: 0, y: 0}];
                initMainGraph(true);
            }
        }
        appSettings.targetAltitude = targetAltitude;

    } else {
        if (landingSequenceActiveInMode && targetAltitude === 0) {
            if (dronePathBeforeLanding) {
                targetAltitude = dronePathBeforeLanding.altitudeBeforeLanding;
                isAltitudeChanging = true;
                isReturningToPathAfterLandingCancel = true;
                landingSequenceActiveInMode = false;
                landingInPlaceCellular = false;
                isLanded = false;
            } else {
                targetAltitude = appSettings.targetAltitude || INITIAL_TAKEOFF_ALTITUDE;
                isAltitudeChanging = true;
                landingSequenceActiveInMode = false;
                landingInPlaceCellular = false;
                isLanded = false;
                isPathPausedForLanding = false;
            }
        } else {
            dronePathBeforeLanding = {
                x: x, y: y, altitudeBeforeLanding: altitude,
                modeState: {}
            };
            if (isSquareModeActive) {
                dronePathBeforeLanding.modeState = {
                    type: 'square',
                    index: currentSquarePathIndex,
                    isFlying: isFlyingSquarePath,
                    reachedAlt: droneReachedTargetAltitudeForSquarePath,
                    coordinates: JSON.parse(JSON.stringify(squarePathCoordinates))
                };
            } else if (isCircleModeActive) {
                dronePathBeforeLanding.modeState = {
                    type: 'circle',
                    angle: currentCircleAngle,
                    isFlying: isFlyingCirclePath,
                    reachedAlt: droneReachedTargetAltitudeForCirclePath,
                    isApproaching: isApproachingCircleStart,
                    approachTarget: currentCircleApproachTarget
                };
            } else if (isVoronoiModeActive) {
                dronePathBeforeLanding.modeState = {
                    type: 'voronoi',
                    index: currentVoronoiPathIndex,
                    isFlying: isFlyingVoronoiPath,
                    reachedAlt: droneReachedTargetAltitudeForVoronoiPath,
                    coordinates: JSON.parse(JSON.stringify(voronoiPathCoordinates)),
                    returningToOrigin: voronoiTwoPointReturningToOrigin
                };
            } else if (isCellularDecompositionModeActive) {
                dronePathBeforeLanding.modeState = {
                    type: 'cells',
                    path: JSON.parse(JSON.stringify(cellularPathCoordinates)),
                    returnPath: JSON.parse(JSON.stringify(cellularReturnPathCoordinates)),
                    index: currentCellularPathIndex,
                    isReturning: isReturningToStartCellular,
                    reachedAlt: droneReachedTargetAltitudeForCellularPath,
                    isFlying: isFlyingCellularPath,
                    endPoint: JSON.parse(JSON.stringify(cellularEndPoint)),
                    obstacles: JSON.parse(JSON.stringify(cellularObstacles))
                };
            }

            targetAltitude = 0;
            isAltitudeChanging = true;
            isPathPausedForLanding = true;

            if (isCellularDecompositionModeActive) {
                landingInPlaceCellular = true;
                landingSequenceActiveInMode = true;
            } else {
                landingInPlaceCellular = false;
                landingSequenceActiveInMode = true;
            }
        }
    }

    if (altitudeAnimationFrameId === null && isFlying) {
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
    if (droneAnimationFrameId === null && isFlying) {
        lastPositionUpdate = performance.now();
        droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
    }
}

function _initiateTakeoff(isResumeFromCurrentPositionInMode) {
    targetAltitude = appSettings.targetAltitude > INITIAL_TAKEOFF_ALTITUDE / 2 ? appSettings.targetAltitude : INITIAL_TAKEOFF_ALTITUDE;
    isLanded = false;
    isAltitudeChanging = true;

    landingSequenceActiveInMode = false;
    isReturningToPathAfterLandingCancel = false;
    isPathPausedForLanding = false;

    if (isSquareModeActive) {
        if (!isResumeFromCurrentPositionInMode) {
            currentSquarePathIndex = 0;
            x = 0;
            y = 0;
        }
        isFlyingSquarePath = false;
        droneReachedTargetAltitudeForSquarePath = false;
    }
    if (isCircleModeActive) {
        if (!isResumeFromCurrentPositionInMode) {
            isApproachingCircleStart = true;
            currentCircleAngle = 0;
            x = 0;
            y = 0;
        } else {
            if (!isApproachingCircleStart) isApproachingCircleStart = false;
            else {
                isApproachingCircleStart = true;
            }
        }
        isFlyingCirclePath = false;
        droneReachedTargetAltitudeForCirclePath = false;
    }
    if (isVoronoiModeActive) {
        if (!isResumeFromCurrentPositionInMode) {
            currentVoronoiPathIndex = 0;
            x = 0;
            y = 0;
            voronoiPathCoordinates = JSON.parse(JSON.stringify(appSettings.voronoiPoints));
        }
        isFlyingVoronoiPath = false;
        droneReachedTargetAltitudeForVoronoiPath = false;
    }

    if (altitudeAnimationFrameId === null && isFlying) {
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
    if (droneAnimationFrameId === null && isFlying) {
        lastPositionUpdate = performance.now();
        droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
    }
}

// Очистка графиков
function clearGraphs(confirmed = false) {
    if (!confirmed) {
        showClearConfirmation();
        return;
    }

    if (isFlying) {
        toggleStartStop();
    } else {
        if (altitudeAnimationFrameId !== null) cancelAnimationFrame(altitudeAnimationFrameId);
        if (droneAnimationFrameId !== null) cancelAnimationFrame(droneAnimationFrameId);
        altitudeAnimationFrameId = null;
        droneAnimationFrameId = null;
    }

    warningsTriggered = {altitude: false, temperature: false, pressure: false};
    resetIndicators();
    currentDroneName = null;
    selectedDroneDetails = null;
    document.querySelectorAll('.drone-item.active').forEach(item => item.classList.remove('active'));

    isSquareModeActive = false;
    currentSquarePathIndex = 0;
    isFlyingSquarePath = false;
    droneReachedTargetAltitudeForSquarePath = false;

    isCircleModeActive = false;
    isFlyingCirclePath = false;
    droneReachedTargetAltitudeForCirclePath = false;
    currentCircleAngle = 0;
    isApproachingCircleStart = true;
    currentCircleApproachTarget = null;

    isVoronoiModeActive = false;
    voronoiPathCoordinates = [];
    appSettings.voronoiPoints = [];
    currentVoronoiPathIndex = 0;
    isFlyingVoronoiPath = false;
    droneReachedTargetAltitudeForVoronoiPath = false;

    isCellularDecompositionModeActive = false;
    cellularEndPoint = {x: null, y: null};
    appSettings.cellularEndPoint = {x: null, y: null};
    cellularObstacles = [];
    cellularPathCoordinates = [];
    cellularReturnPathCoordinates = [];
    currentCellularPathIndex = 0;
    isFlyingCellularPath = false;
    droneReachedTargetAltitudeForCellularPath = false;
    isReturningToStartCellular = false;

    dronePathBeforeLanding = null;
    isReturningToPathAfterLandingCancel = false;
    landingSequenceActiveInMode = false;
    isPathPausedForLanding = false;

    controlAltitude = 0;
    altitude = 0;
    smoothedOscillation = 0;
    x = 0;
    y = 0;
    speedX = 0;
    speedY = 0;
    targetAltitude = INITIAL_TAKEOFF_ALTITUDE;
    appSettings.targetAltitude = INITIAL_TAKEOFF_ALTITUDE;
    isLanded = true;
    lastAltitudeBeforeLanding = INITIAL_TAKEOFF_ALTITUDE;
    time = 0;
    path = [{x: 0, y: 0}];
    isAltitudeChanging = false;

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

    const startStopButton = document.getElementById('startStopButton');
    if (startStopButton) {
        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
                <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
            </svg>`;
        startStopButton.style.backgroundColor = '#28a745';
    }

    updateSettingsFields();

    isSimulationActive = false;
    updateUIState();

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 50);
}

async function saveData() {
    if (!selectedDroneDetails || !selectedDroneDetails.id) {
        openModal('Пожалуйста, выберите дрон перед сохранением полёта.');
        return;
    }
    if (time === 0 && (isLanded || !isFlying)) {
        openModal('Нет данных для сохранения. Начните полёт.');
        return;
    }

    showFlightNamePrompt(async flightName => {
        if (flightName === null) {
            return;
        }

        const flightDuration = parseFloat(time.toFixed(1));
        const maxAltitudeAchieved = altitudeData.y.length ? Math.max(...altitudeData.y) : 0;
        const minTemperatureAchieved = temperatureData.y.length ? Math.min(...temperatureData.y) : null;
        const minPressureAchieved = pressureData.y.length ? Math.min(...pressureData.y) : null;
        let warningsString = '';
        if (warningsTriggered.altitude) warningsString += 'A';
        if (warningsTriggered.temperature) warningsString += 'T';
        if (warningsTriggered.pressure) warningsString += 'P';
        if (!warningsString) warningsString = 'Нет';

        try {
            let locationImg = '', altitudeImg = '', tempImg = '', pressureImg = '';
            let imageErrors = [];
            try {
                locationImg = await Plotly.toImage('main-graph', {format: 'png', width: 600, height: 400});
                if (typeof locationImg !== 'string' || !locationImg.startsWith('data:image/png;base64,')) {
                    imageErrors.push('Ошибка генерации изображения местоположения.');
                    locationImg = '';
                }
            } catch (e) {
                imageErrors.push(`Критическая ошибка Plotly.toImage (main-graph): ${e.message}`);
                locationImg = '';
            }
            try {
                altitudeImg = await Plotly.toImage('altitude-graph', {format: 'png', width: 600, height: 400});
                if (typeof altitudeImg !== 'string' || !altitudeImg.startsWith('data:image/png;base64,')) {
                    imageErrors.push('Ошибка генерации изображения местоположения.');
                    altitudeImg = '';
                }
            } catch (e) {
                imageErrors.push(`Критическая ошибка Plotly.toImage (altitude-graph): ${e.message}`);
                locationImg = '';
            }
            try {
                tempImg = await Plotly.toImage('temperature-graph', {format: 'png', width: 600, height: 400});
                if (typeof tempImg !== 'string' || !tempImg.startsWith('data:image/png;base64,')) {
                    imageErrors.push('Ошибка генерации изображения местоположения.');
                    tempImg = '';
                }
            } catch (e) {
                imageErrors.push(`Критическая ошибка Plotly.toImage (temperature-graph): ${e.message}`);
                locationImg = '';
            }
            try {
                pressureImg = await Plotly.toImage('pressure-graph', {format: 'png', width: 600, height: 400});
                if (typeof pressureImg !== 'string' || !pressureImg.startsWith('data:image/png;base64,')) {
                    imageErrors.push('Ошибка генерации изображения местоположения.');
                    pressureImg = '';
                }
            } catch (e) {
                imageErrors.push(`Критическая ошибка Plotly.toImage (pressure-graph): ${e.message}`);
                pressureImg = '';
            }

            const flightData = {
                naming: flightName,
                drone_id: selectedDroneDetails.id,
                flight_time: flightDuration,
                location_graph: locationImg,
                altitude_graph: altitudeImg,
                temperature_graph: tempImg,
                pressure_graph: pressureImg,
                max_flight_altitude: parseFloat(maxAltitudeAchieved.toFixed(2)),
                min_flight_temperature: minTemperatureAchieved !== null ? parseFloat(minTemperatureAchieved.toFixed(2)) : null,
                min_flight_pressure: minPressureAchieved !== null ? parseFloat(minPressureAchieved.toFixed(2)) : null,
                warnings: warningsString
            };

            const resp = await fetch('http://localhost:3000/flights', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(flightData)
            });
            if (!resp.ok) {
                const errText = await resp.text();
                let errJson = null;
                try { errJson = JSON.parse(errText); } catch (e) {}
                console.error('Ошибка ответа сервера при сохранении:', errText);
                throw new Error(errJson?.error || `Ошибка сервера: ${resp.status} - ${resp.statusText}. Ответ: ${errText}`);
            }
            await resp.json();
            openModal(`Полет "${flightName}" успешно сохранён!`);
            allFlightsData = null;
            showFlights()
        } catch (error) {
            console.error('Ошибка при сохранении данных полёта:', error);
            openModal(`Ошибка сохранения: ${error.message}`);
        }
    });
    allFlightsData = null;
    showFlights();
}

function showFlightNamePrompt(callback) {
    const modalId = 'flightNamePromptModal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';

    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">Сохранение полёта</h3>
            <div class="input-group" style="padding: 0 20px;">
                <input type="text" id="flightNameInput" placeholder=" ">
                <label for="flightNameInput">Название полёта</label>
            </div>
            <div id="flightNameError" class="error-message"
                 style="color: red; font-size: 0.9em; margin-top: -15px; margin-bottom: 10px; display: none;">
            </div>
            <div class="modal-actions">
                <button id="cancelFlightNameBtn" class="button-danger">Отмена</button>
                <button id="confirmFlightNameBtn" class="button-success">Сохранить</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => modal.classList.add('active'), 50);

    const flightNameInput = modal.querySelector('#flightNameInput');
    const confirmBtn = modal.querySelector('#confirmFlightNameBtn');
    const cancelBtn = modal.querySelector('#cancelFlightNameBtn');
    const errorDiv = modal.querySelector('#flightNameError');

    const now = new Date();
    flightNameInput.value = `Полет ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    })}`;
    flightNameInput.focus();
    flightNameInput.select();

    const closeModalPrompt = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    };

    confirmBtn.onclick = () => {
        const name = flightNameInput.value.trim();
        if (!name) {
            errorDiv.textContent = 'Название полёта не может быть пустым.';
            errorDiv.style.display = 'block';
            flightNameInput.focus();
            return;
        }
        errorDiv.style.display = 'none';
        closeModalPrompt();
        callback(name);
    };

    cancelBtn.onclick = () => {
        closeModalPrompt();
        callback(null);
    };

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            closeModalPrompt();
            callback(null);
        }
    });

    flightNameInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') confirmBtn.click();
    });
}

async function showFlights() {
    if (isSimulationActive) {
        openModal('Настройки недоступны во время моделирования');
        return;
    }
    let modal = document.getElementById('flightsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'flightsModal';
        modal.className = 'modal flight-log-modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h2>Сохраненные полёты</h2>
                <button class="close-button" onclick="closeFlightsModal()">&times;</button>
            </div>
            <div class="search-bar-modal">
                <input type="text" id="flightSearchInput" placeholder="Поиск по названию полёта..." oninput="filterFlights()">
            </div>
            <div id="flightsListContainer" class="flights-list-container">
                <p>Загрузка полётов...</p>
            </div>
        </div>`;

    setTimeout(() => modal.classList.add('active'), 50);

    const closeButton = modal.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', closeFlightsModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFlightsModal();
        }
    });

    const flightsListContainer = document.getElementById('flightsListContainer');

    try {
        if (allFlightsData !== null) {
            console.log('Данные из allFlightsData для рендеринга:', JSON.stringify(allFlightsData, null, 2));
            renderFlightsList(allFlightsData);
        } else {
            console.log('Данные о полетах не были предварительно загружены или загрузка не удалась, загрузка при открытии модального окна...');
            const response = await fetch('http://localhost:3000/flights');
            if (!response.ok) {
                throw new Error(`Не удалось загрузить список полётов: ${response.status}`);
            }
            const flights = await response.json();
            allFlightsData = flights;
            renderFlightsList(flights);
        }
    } catch (error) {
        console.error('Ошибка при загрузке полётов (в showFlights):', error);
        if (flightsListContainer) {
            flightsListContainer.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`;
        }
    }
}

function closeFlightsModal() {
    const modal = document.getElementById('flightsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderFlightsList(flights) {
    const container = document.getElementById('flightsListContainer');
    if (!container) return;
    if (flights.length === 0) {
        container.innerHTML = '<p>Сохраненных полётов нет.</p>';
        return;
    }

    container.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'flights-list';
    flights.forEach(flight => {
        const t = typeof flight.flight_time === 'number'
            ? flight.flight_time.toFixed(1) + ' сек'
            : '-';
        const maxAlt = typeof flight.max_flight_altitude === 'number'
            ? flight.max_flight_altitude.toFixed(1) + ' м'
            : '-';
        const minTemp = typeof flight.min_flight_temperature === 'number'
            ? flight.min_flight_temperature.toFixed(1) + ' °C'
            : '-';
        const minPres = typeof flight.min_flight_pressure === 'number'
            ? flight.min_flight_pressure.toFixed(1) + ' гПа'
            : '-';
        const li = document.createElement('li');
        li.className = 'flight-item';
        const title = flight.naming ?? flight.name ?? '';
        li.dataset.flightName = title.toLowerCase();

        li.innerHTML = `
            <div class="flight-card">
                <div class="flight-card-header">
                    <h3>${title}</h3>
                    <button class="delete-flight-btn button-danger" data-flight-id="${flight.id}" title="Удалить полет">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                        </svg>
                    </button>
                </div>
                <div class="flight-card-content-wrapper">
                    <div class="flight-card-body">
                        <p><strong>Дрон:</strong> ${flight.drone_name || 'Неизвестный дрон'}</p>
                        <p><strong>Дата:</strong> ${new Date(flight.created_at).toLocaleString()}</p>
                        <p><strong>Время полета:</strong> ${t}</p>
                        <p><strong>Макс. высота:</strong> ${maxAlt}</p>
                        <p><strong>Мин. температура:</strong> ${minTemp}</p>
                        <p><strong>Мин. давление:</strong> ${minPres}</p>
                        <p><strong>Предупреждения:</strong> ${flight.warnings || 'Нет'}</p>
                    </div>
                    <div class="flight-graphs-preview">
                        <div><p>Местоположение:</p><img src="${flight.location_graph}" alt="График местоположения"></div>
                        <div><p>Высота:</p><img src="${flight.altitude_graph}" alt="График высоты"></div>
                        <div><p>Температура:</p><img src="${flight.temperature_graph}" alt="График температуры"></div>
                        <div><p>Давление:</p><img src="${flight.pressure_graph}" alt="График давления"></div>
                    </div>
                </div>
            </div>
        `;
        ul.appendChild(li);
    });
    container.appendChild(ul);

    document.querySelectorAll('.delete-flight-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            event.stopPropagation();
            const flightId = event.currentTarget.dataset.flightId;
            showDeleteFlightConfirmation(flightId);
        });
    });
}

function showDeleteFlightConfirmation(flightId) {
    const flightItem = document.querySelector(`.delete-flight-btn[data-flight-id="${flightId}"]`)?.closest('.flight-item');
    const flightName = flightItem?.querySelector('h3')?.textContent || `с ID ${flightId}`;

    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">Подтверждение удаления</h3>
            <div class="modal-message">
                Вы уверены, что хотите удалить полёт "${flightName}"? Это действие необратимо.
            </div>
            <div class="modal-actions">
                <button class="cancel-btn" onclick="closeModal()">Отмена</button>
                <button class="confirm-btn" onclick="confirmDeleteFlight(${flightId})">Удалить</button>
            </div>
        </div>
    `;

    modal.classList.add('active');
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });
}

async function confirmDeleteFlight(flightId) {
    closeModalWithAnimation('modal', async () => {
        try {
            const response = await fetch(`http://localhost:3000/flights/${flightId}`, {method: 'DELETE'});
            if (!response.ok) {
                const err = await response.json().catch(() => ({error: 'Ошибка сервера'}));
                throw new Error(err.error || `Ошибка ${response.status}`);
            }
            openModal('Полет успешно удален.');
            allFlightsData = null;
            showFlights();
        } catch (error) {
            openModal(`Ошибка удаления: ${error.message}`);
        }
    });
}


function filterFlights() {
    const searchInput = document.getElementById('flightSearchInput');
    if (!searchInput) return;
    const searchValue = searchInput.value.toLowerCase().trim();
    const flightItems = document.querySelectorAll('#flightsListContainer .flight-item');

    flightItems.forEach(item => {
        const flightName = item.dataset.flightName || '';
        if (flightName.includes(searchValue)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

async function loadFlightsOnStartup() {
    try {
        const response = await fetch('http://localhost:3000/flights');
        if (!response.ok) {
            console.error(`Ошибка HTTP при фоновой загрузке полетов: ${response.status}`);
            allFlightsData = null;
            return;
        }
        allFlightsData = await response.json();
        console.log('Данные о полетах успешно загружены при запуске (в фоне).');
    } catch (error) {
        console.error('Ошибка при фоновой загрузке полётов:', error);
        allFlightsData = null;
    }
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
            setTimeout(() => renderDrones(), 100);
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterDrones);
    }
    loadDrones();
    loadFlightsOnStartup();

    initMainGraph(true);
    initAltitudeGraph(true);
    initTemperatureGraph(true);
    initPressureGraph(true);
    altitudeIndicator = document.getElementById('indicator-altitude');
    temperatureIndicator = document.getElementById('indicator-temperature');
    pressureIndicator = document.getElementById('indicator-pressure');
    resetIndicators();

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
                    Plotly.Plots.resize(graphDiv).catch(e => console.error(`Ошибка в ${graphId}:`, e));
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
    if (isSquareModeActive) {
        return;
    }
    if (isCellularDecompositionModeActive) {
        return;
    }
    if (isFlying && !isLanded) speedY = 1;
}

function moveBackward() {
    if (isSquareModeActive) {
        return;
    }
    if (isCellularDecompositionModeActive) {
        return;
    }
    if (isFlying && !isLanded) speedY = -1;
}

function moveLeft() {
    if (isSquareModeActive) {
        return;
    }
    if (isCellularDecompositionModeActive) {
        return;
    }
    if (isFlying && !isLanded) speedX = -1;
}

function moveRight() {
    if (isSquareModeActive) {
        return;
    }
    if (isCellularDecompositionModeActive) {
        return;
    }
    if (isFlying && !isLanded) speedX = 1;
}


// Обработчики нажатия и отпускания клавиш
document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.repeat) {
        return;
    }

    if ((isSquareModeActive || isCellularDecompositionModeActive) && isFlying && !isLanded) {
        if (event.code !== 'KeyQ' && event.code !== 'KeyE' && event.code !== 'KeyL') {
            return;
        }
    }

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
                break;
            case 'KeyQ':
                decreaseAltitude();
                break;
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
        case 'KeyE':
            if (isFlying) {
                increaseAltitude();
            }
            break;
        case 'KeyQ':
            if (isFlying) {
                decreaseAltitude();
            }
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
async function showSettings() {
    if (isSimulationActive) {
        openModal('Настройки недоступны во время моделирования.');
        return;
    }
    let modal = document.getElementById('settingsModal');
    if (modal && modal.classList.contains('active')) {
        return;
    }
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'settingsModal';
    document.body.appendChild(modal);
    try {
        const response = await fetch('settings-modal.html');
        if (!response.ok) throw new Error(`Не удалось загрузить settings-modal.html: ${response.statusText}`);
        const html = await response.text();
        modal.innerHTML = html;

        const form = modal.querySelector('#settingsForm');
        if (form) {
            const graphSettingsTitleElement = Array.from(form.querySelectorAll('h4.section-title'))
                .find(h4 => h4.textContent.includes('Настройки графиков'));
            const referenceNodeForInsertion = graphSettingsTitleElement ? graphSettingsTitleElement.closest('.settings-section') : null;

            const insertSection = (sectionHTML, id) => {
                let section = modal.querySelector(`#${id}`);
                if (!section) {
                    section = sectionHTML;
                    if (referenceNodeForInsertion) {
                        form.insertBefore(section, referenceNodeForInsertion);
                    } else {
                        const flightShapesSection = Array.from(form.children).find(child => child.classList.contains('settings-section') && child.querySelector('.flight-shapes'));
                        let targetInsertionPoint = form.lastElementChild.previousElementSibling;
                        if (flightShapesSection) {
                            let currentEl = flightShapesSection;
                            if(currentEl.nextElementSibling && currentEl.nextElementSibling.classList.contains('settings-section')) {
                                currentEl = currentEl.nextElementSibling;
                                if (currentEl.nextElementSibling) {
                                    targetInsertionPoint = currentEl.nextElementSibling;
                                }
                            }
                        }
                        form.insertBefore(section, targetInsertionPoint);
                    }
                }
                return section;
            };

            insertSection(createCircleInputSectionHTML(), 'circle_settings_section');
            insertSection(createSquareInputSectionHTML(), 'square_settings_section');
            insertSection(createPointInputSectionHTML('voronoi', 'Метод Вороного'), 'voronoi_settings_section');
            insertSection(createPointInputSectionHTML('cells', 'Клеточная декомпозиция'), 'cells_settings_section');
        }

        updateSettingsFields();
        setupSettingsInputHandlers();

        setTimeout(() => modal.classList.add('active'), 10);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const settingsSnapshot = JSON.parse(modal.dataset.settingsSnapshot || '{}');

                appSettings.heightAboveSea = settingsSnapshot.heightAboveSea !== undefined ? settingsSnapshot.heightAboveSea : 0;
                appSettings.targetAltitude = settingsSnapshot.targetAltitude !== undefined ? settingsSnapshot.targetAltitude : INITIAL_TAKEOFF_ALTITUDE;
                appSettings.voronoiPoints = settingsSnapshot.voronoiPoints || [];
                appSettings.cellularEndPoint = settingsSnapshot.cellularEndPoint || {x: null, y: null};
                appSettings.circleRadius = settingsSnapshot.circleRadius !== undefined ? settingsSnapshot.circleRadius : 50;
                appSettings.squareDimension = settingsSnapshot.squareDimension !== undefined ? settingsSnapshot.squareDimension : 32;

                heightAboveSeaLevel = appSettings.heightAboveSea;
                if (isFlying && !isLanded && targetAltitude !== appSettings.targetAltitude) {
                    targetAltitude = appSettings.targetAltitude;
                    isAltitudeChanging = true;
                }
                CIRCLE_RADIUS = appSettings.circleRadius;
                const N_revert = appSettings.squareDimension;
                SQUARE_START_POINT = { x: 0, y: N_revert };
                squarePathCoordinates = [
                    { x: -N_revert, y: N_revert }, { x: -N_revert, y: -N_revert },
                    { x: N_revert, y: -N_revert }, { x: N_revert, y: N_revert }
                ];

                closeSettingsModal();
            }
        });
        modal.dataset.settingsSnapshot = JSON.stringify(appSettings);

    } catch (error) {
        console.error('Ошибка в окне настроек:', error);
        const existingModal = document.getElementById('settingsModal');
        if (existingModal) existingModal.remove();
        openModal(`Ошибка загрузки настроек: ${error.message}`);
    }
}

function createPointInputSectionHTML(modePrefix, title) {
    const section = document.createElement('div');
    section.id = `${modePrefix}_settings_section`;
    section.className = 'settings-section point-input-section';
    section.style.display = 'none';
    if (modePrefix === 'cells') {
        section.innerHTML = `
            <h5 class="section-title">Конечная точка для "${title}"</h5>
            <div class="point-input-controls">
                <input type="number" id="${modePrefix}_x_input" placeholder="X">
                <input type="number" id="${modePrefix}_y_input" placeholder="Y">
                <button type="button" id="set_${modePrefix}_endpoint_btn" class="button-primary">Установить точку</button>
            </div>
            <div id="${modePrefix}_endpoint_display" class="points-list" style="min-height: 30px;"></div>
            `;
    } else {
        section.innerHTML = `
            <div class="voronoi-content-wrapper">
                <h5 class="section-title">Координаты для "${title}"</h5>
                <div class="point-input-controls">
                    <input type="number" id="${modePrefix}_x_input" placeholder="X">
                    <input type="number" id="${modePrefix}_y_input" placeholder="Y">
                    <button type="button" id="add_${modePrefix}_point_btn" class="button-primary">Добавить</button>
                </div>
                <div class="scrollable-points-container">
                    <div id="${modePrefix}_points_list" class="points-list"></div>
                </div>
                <div class="clear-button-container">
                    <button type="button" id="clear_${modePrefix}_points_btn" class="button-danger">Очистить все точки</button>
                </div>
            </div>
        `;
    }
    return section;
}

function createCircleInputSectionHTML() {
    const section = document.createElement('div');
    section.id = 'circle_settings_section';
    section.className = 'settings-section point-input-section';
    section.style.display = 'none';
    section.innerHTML = `
        <h5 class="section-title" style="margin-top:0; margin-bottom:10px; font-size: 1em; color: inherit;">Параметр для "Круг"</h5>
        <div class="point-input-controls">
            <label for="circle_radius_input" style="margin-right: 10px; align-self: center; color: inherit;">Радиус (R):</label>
            <input type="number" id="circle_radius_input" placeholder="R" style="flex-grow:1; width: auto;" class="form-control">
        </div>
    `;
    return section;
}

function createSquareInputSectionHTML() {
    const section = document.createElement('div');
    section.id = 'square_settings_section';
    section.className = 'settings-section point-input-section';
    section.style.display = 'none';
    section.innerHTML = `
        <h5 class="section-title" style="margin-top:0; margin-bottom:10px; font-size: 1em; color: inherit;">Параметр для "Квадрат"</h5>
        <div class="point-input-controls">
            <label for="square_dimension_input" style="margin-right: 10px; align-self: center; color: inherit;">Число (N):</label>
            <input type="number" id="square_dimension_input" placeholder="N" style="flex-grow:1; width: auto;" class="form-control">
        </div>
    `;
    return section;
}

function renderPointsList(modePrefix, pointsArray) {
    const listDiv = document.getElementById(`${modePrefix}_points_list`);
    if (!listDiv) return;
    listDiv.innerHTML = '';
    pointsArray.forEach((point, index) => {
        const pointDiv = document.createElement('div');
        pointDiv.textContent = `Точка ${index + 1}: (X: ${point.x}, Y: ${point.y})`;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Удалить';
        removeBtn.className = 'button-danger remove-point-btn';
        removeBtn.onclick = () => {
            removePoint(modePrefix, index);
        };
        pointDiv.appendChild(removeBtn);
        listDiv.appendChild(pointDiv);
    });
}

function addPoint(modePrefix) {
    const xInput = document.getElementById(`${modePrefix}_x_input`);
    const yInput = document.getElementById(`${modePrefix}_y_input`);
    if (!xInput || !yInput) return;

    const x = parseFloat(xInput.value);
    const y = parseFloat(yInput.value);
    if (isNaN(x) || isNaN(y)) {
        openModal('Пожалуйста, введите корректные числовые значения для X и Y.');
        return;
    }

    if (modePrefix === 'voronoi') {
        if (!Array.isArray(appSettings.voronoiPoints)) appSettings.voronoiPoints = [];

        if (appSettings.voronoiPoints.length >= 10) {
            openModal('Можно добавить максимум 10 точек для метода Вороного.');
            return;
        }

        appSettings.voronoiPoints.push({
            x,
            y
        });
        renderPointsList(modePrefix, appSettings.voronoiPoints);
    }

    xInput.value = '';
    yInput.value = '';
    xInput.focus();
}

function removePoint(modePrefix, index) {
    if (modePrefix === 'voronoi') {
        if (Array.isArray(appSettings.voronoiPoints) && index >= 0 && index < appSettings.voronoiPoints.length) {
            appSettings.voronoiPoints.splice(index, 1);
            renderPointsList(modePrefix, appSettings.voronoiPoints);
        }
    }
}

function clearPoints(modePrefix) {
    if (modePrefix === 'voronoi') {
        appSettings.voronoiPoints = [];
        renderPointsList(modePrefix, appSettings.voronoiPoints);
    }
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

    const hi = modal.querySelector('#height_above_sea');
    const ta = modal.querySelector('#target_altitude');
    if (hi) hi.value = appSettings.heightAboveSea !== undefined ? appSettings.heightAboveSea : 0;
    if (ta) ta.value = appSettings.targetAltitude !== undefined ? appSettings.targetAltitude : INITIAL_TAKEOFF_ALTITUDE;

    updateCalculatedValues(appSettings.heightAboveSea !== undefined ? appSettings.heightAboveSea : 0);

    const allModeButtons = modal.querySelectorAll('.shape-btn');
    const activeModeButtonClass = 'active-flight-mode';

    const squareBtn = modal.querySelector('.shape-btn[data-shape="square"]');
    const circleBtn = modal.querySelector('.shape-btn[data-shape="circle"]');
    const voronoiBtn = modal.querySelector('.shape-btn[data-shape="voronoi"]');
    const cellsBtn = modal.querySelector('.shape-btn[data-shape="cells"]');

    const circleSettingsSection = modal.querySelector('#circle_settings_section');
    const squareSettingsSection = modal.querySelector('#square_settings_section');
    const voronoiSettingsSection = modal.querySelector('#voronoi_settings_section');
    const cellsSettingsSection = modal.querySelector('#cells_settings_section');

    const hideSection = (section) => {
        if (section && section.style.display !== 'none') {
            section.classList.remove('active-sub-modal');
            section.style.maxHeight = null;
            setTimeout(() => {
                if (!section.classList.contains('active-sub-modal')) {
                    section.style.display = 'none';
                }
            }, 300);
        } else if (section && !section.classList.contains('active-sub-modal')) {
            section.style.display = 'none';
        }
    };

    const showSection = (section, renderCallback) => {
        if (section) {
            section.style.display = 'block';
            setTimeout(() => {
                section.classList.add('active-sub-modal');
                section.style.maxHeight = section.scrollHeight + "px";
                if (renderCallback) renderCallback();
            }, 10);
        }
    };

    if (!isCircleModeActive) hideSection(circleSettingsSection);
    if (!isSquareModeActive) hideSection(squareSettingsSection);
    if (!isVoronoiModeActive) hideSection(voronoiSettingsSection);
    if (!isCellularDecompositionModeActive) hideSection(cellsSettingsSection);

    allModeButtons.forEach(btn => btn.classList.remove(activeModeButtonClass));
    allModeButtons.forEach(btn => btn.disabled = false);

    let aModeIsActive = false;
    if (isSquareModeActive) {
        if (squareBtn) squareBtn.classList.add(activeModeButtonClass);
        aModeIsActive = true;
        showSection(squareSettingsSection, () => {
            const input = modal.querySelector('#square_dimension_input');
            if (input) input.value = appSettings.squareDimension !== undefined ? appSettings.squareDimension : 32;
        });
    } else if (isCircleModeActive) {
        if (circleBtn) circleBtn.classList.add(activeModeButtonClass);
        aModeIsActive = true;
        showSection(circleSettingsSection, () => {
            const input = modal.querySelector('#circle_radius_input');
            if (input) input.value = appSettings.circleRadius !== undefined ? appSettings.circleRadius : 50;
        });
    } else if (isVoronoiModeActive) {
        if (voronoiBtn) voronoiBtn.classList.add(activeModeButtonClass);
        aModeIsActive = true;
        showSection(voronoiSettingsSection, () => renderPointsList('voronoi', Array.isArray(appSettings.voronoiPoints) ? appSettings.voronoiPoints : []));
    } else if (isCellularDecompositionModeActive) {
        if (cellsBtn) cellsBtn.classList.add(activeModeButtonClass);
        aModeIsActive = true;
        showSection(cellsSettingsSection, () => renderCellularEndpoint());
    }

    if (aModeIsActive) {
        allModeButtons.forEach(btn => {
            if (!btn.classList.contains(activeModeButtonClass)) {
                btn.disabled = true;
            }
        });
    }
}

function updateCalculatedValues(heightToCalculate) {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    let h = (typeof heightToCalculate === 'number')
        ?
        heightToCalculate
        : parseFloat(modal.querySelector('#height_above_sea')?.value) || 0;
    const temperature = T0 + L * h - 273.15;
    const pressure = P0 * Math.pow(1 + (L * h) / T0, -(g * M) / (R * L)) / 100;

    const tf = modal.querySelector('#calculated_temperature');
    const pf = modal.querySelector('#calculated_pressure');
    if (tf) tf.value = temperature.toFixed(1);
    if (pf) pf.value = pressure.toFixed(1);
}

// Обработчик данных для настроек
function setupSettingsInputHandlers() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;


    const hi = modal.querySelector('#height_above_sea');
    const ta = modal.querySelector('#target_altitude');
    const saveBtn = modal.querySelector('#saveSettingsBtn');
    const cancelBtn = modal.querySelector('#cancelSettingsBtn');
    const defBtn = modal.querySelector('.defaults-btn');

    const sqBtn = modal.querySelector('.shape-btn[data-shape="square"]');
    const circleBtn = modal.querySelector('.shape-btn[data-shape="circle"]');
    const voronoiBtn = modal.querySelector('.shape-btn[data-shape="voronoi"]');
    const cellsBtn = modal.querySelector('.shape-btn[data-shape="cells"]');

    const circleRadiusInput = modal.querySelector('#circle_radius_input');
    const squareDimensionInput = modal.querySelector('#square_dimension_input');

    if (hi) hi.addEventListener('input', () => updateCalculatedValues(parseFloat(hi.value) || 0));

    if (saveBtn) saveBtn.addEventListener('click', () => {
        if (isVoronoiModeActive && (!appSettings.voronoiPoints || appSettings.voronoiPoints.length < 2)) {
            openModal('Для активации режима Вороного необходимо как минимум 2 точки. Пожалуйста, добавьте точки или выберите другой режим.');
            return;
        }
        if (isCellularDecompositionModeActive && (!appSettings.cellularEndPoint || typeof appSettings.cellularEndPoint.x !== 'number')) {
            openModal('Для активации режима клеточной декомпозиции необходимо установить конечную точку. Пожалуйста, задайте точку или выберите другой режим.');
            return;
        }

        const newH = parseFloat(hi?.value) || 0;
        const newT = parseFloat(ta?.value) || INITIAL_TAKEOFF_ALTITUDE;

        let altitudeOrModeParamsChanged = false;
        if (newT !== appSettings.targetAltitude) altitudeOrModeParamsChanged = true;

        appSettings.heightAboveSea = newH;
        heightAboveSeaLevel = newH;
        appSettings.targetAltitude = newT;

        if (isFlying && !isLanded) {
            if (targetAltitude !== newT) {
                targetAltitude = newT;
                isAltitudeChanging = true;
            }
        }

        if (isCircleModeActive && circleRadiusInput) {
            const newRadius = parseFloat(circleRadiusInput.value);
            if (!isNaN(newRadius) && newRadius > 0) {
                if (appSettings.circleRadius !== newRadius) altitudeOrModeParamsChanged = true;
                appSettings.circleRadius = newRadius;
                CIRCLE_RADIUS = newRadius;
            } else {
                openModal('Пожалуйста, введите корректный положительный радиус для круга.'); return;
            }
        }

        if (isSquareModeActive && squareDimensionInput) {
            const newDimension = parseFloat(squareDimensionInput.value);
            if (!isNaN(newDimension) && newDimension !== 0) {
                if (appSettings.squareDimension !== newDimension) altitudeOrModeParamsChanged = true;
                appSettings.squareDimension = newDimension;
                const N = newDimension;
                SQUARE_START_POINT = { x: 0, y: N };
                squarePathCoordinates = [
                    { x: -N, y: N }, { x: -N, y: -N },
                    { x: N, y: -N }, { x: N, y: N }
                ];
            } else {
                openModal('Пожалуйста, введите корректное (обычно положительное) число для квадрата.'); return;
            }
        }

        if (altitudeOrModeParamsChanged && isFlying) {
            if (isSquareModeActive) {
                droneReachedTargetAltitudeForSquarePath = false;
                isApproachingSquareStartPoint = true;
                currentSquarePathIndex = 0; // Начать путь заново
            }
            if (isCircleModeActive) {
                droneReachedTargetAltitudeForCirclePath = false;
                isApproachingCircleStart = true;
            }
            if (isVoronoiModeActive) {
                droneReachedTargetAltitudeForVoronoiPath = false;
                currentVoronoiPathIndex = 0;
            }
            if (isCellularDecompositionModeActive) {
                droneReachedTargetAltitudeForCellularPath = false;
                currentCellularPathIndex = 0;
            }
            console.log("Целевая высота или параметры режима изменены. Дрон будет корректировать полет.");
        }


        appSettings.lastUpdated = new Date();
        updateCalculatedValues(newH);

        if (isVoronoiModeActive) {
            voronoiPathCoordinates = JSON.parse(JSON.stringify(Array.isArray(appSettings.voronoiPoints) ? appSettings.voronoiPoints : []));
            if (isFlying) {
                currentVoronoiPathIndex = 0; isFlyingVoronoiPath = false; droneReachedTargetAltitudeForVoronoiPath = false;
                voronoiTwoPointReturningToOrigin = false; voronoiReturnToOriginAfterCycle = false;
            }
        }
        if (isCellularDecompositionModeActive) {
            if (appSettings.cellularEndPoint && typeof appSettings.cellularEndPoint.x === 'number') {
                cellularEndPoint = {...appSettings.cellularEndPoint};
                generateCellularObstacles();
                cellularPathCoordinates = []; cellularReturnPathCoordinates = []; currentCellularPathIndex = 0; isReturningToStartCellular = false;
                if (isFlying) {
                    droneReachedTargetAltitudeForCellularPath = false; isFlyingCellularPath = false;
                }
                initMainGraph(true);
            } else {
                openModal("Ошибка: Конечная точка для клеточной декомпозиции не установлена корректно."); return;
            }
        }
        closeSettingsModal();
    });

    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        modal.dispatchEvent(event);
    });


    if (defBtn) defBtn.addEventListener('click', () => {
        if (hi) hi.value = 0;
        if (ta) ta.value = INITIAL_TAKEOFF_ALTITUDE;
        appSettings.heightAboveSea = 0;
        appSettings.targetAltitude = INITIAL_TAKEOFF_ALTITUDE;

        appSettings.voronoiPoints = [];
        if(modal.querySelector('#voronoi_points_list')) renderPointsList('voronoi', appSettings.voronoiPoints);

        appSettings.cellularEndPoint = {x: null, y: null};
        if(modal.querySelector('#cells_endpoint_display')) renderCellularEndpoint();

        if (circleRadiusInput) circleRadiusInput.value = 50;
        appSettings.circleRadius = 50;
        CIRCLE_RADIUS = 50;

        if (squareDimensionInput) squareDimensionInput.value = 32;
        appSettings.squareDimension = 32;
        const N_def = 32;
        SQUARE_START_POINT = {x: 0, y: N_def};
        squarePathCoordinates = [
            {x: -N_def, y: N_def}, {x: -N_def, y: -N_def},
            {x: N_def, y: -N_def}, {x: N_def, y: N_def}
        ];

        updateCalculatedValues(0);
    });

    if (sqBtn) sqBtn.addEventListener('click', handleSquareModeToggle);
    if (circleBtn) circleBtn.addEventListener('click', handleCircleModeToggle);
    if (voronoiBtn) voronoiBtn.addEventListener('click', handleVoronoiModeToggle);
    if (cellsBtn) cellsBtn.addEventListener('click', handleCellularDecompositionModeToggle);

    const addVoronoiBtn = modal.querySelector('#add_voronoi_point_btn');
    const clearVoronoiBtn = modal.querySelector('#clear_voronoi_points_btn');
    if (addVoronoiBtn) addVoronoiBtn.onclick = () => addPoint('voronoi');
    if (clearVoronoiBtn) clearVoronoiBtn.onclick = () => clearPoints('voronoi');

    const setCellularBtn = modal.querySelector('#set_cells_endpoint_btn');
    if (setCellularBtn) setCellularBtn.onclick = setCellularEndpoint;

    updateSettingsFields();
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

function resetAllSpecialModesState(exceptMode = null) {
    if (exceptMode !== 'square') {
        isSquareModeActive = false;
        isFlyingSquarePath = false;
        droneReachedTargetAltitudeForSquarePath = false;
        currentSquarePathIndex = 0;
        isApproachingSquareStartPoint = false;
    }
    if (exceptMode !== 'circle') {
        isCircleModeActive = false;
        isFlyingCirclePath = false;
        droneReachedTargetAltitudeForCirclePath = false;
        isApproachingCircleStart = false;
        currentCircleAngle = 0;
    }
    if (exceptMode !== 'voronoi') {
        isVoronoiModeActive = false;
        isFlyingVoronoiPath = false;
        droneReachedTargetAltitudeForVoronoiPath = false;
        currentVoronoiPathIndex = 0;
    }
    if (exceptMode !== 'cells') {
        isCellularDecompositionModeActive = false;
        isFlyingCellularPath = false;
        droneReachedTargetAltitudeForCellularPath = false;
        currentCellularPathIndex = 0;
        cellularObstacles = [];
        cellularPathCoordinates = [];
        cellularReturnPathCoordinates = [];
        isReturningToStartCellular = false;
    }

    isPathPausedForLanding = false;
    landingSequenceActiveInMode = false;
    isReturningToPathAfterLandingCancel = false;
    dronePathBeforeLanding = null;
}

function handleSquareModeToggle() {
    isSquareModeActive = !isSquareModeActive;
    if (isSquareModeActive) {
        resetAllSpecialModesState('square');
        if (appSettings.squareDimension === undefined) {
            appSettings.squareDimension = 32;
        }
        isApproachingSquareStartPoint = true;
    } else {
        isApproachingSquareStartPoint = false;
    }
    updateSettingsFields();
}

function handleCircleModeToggle() {
    isCircleModeActive = !isCircleModeActive;
    if (isCircleModeActive) {
        resetAllSpecialModesState('circle');
        if (appSettings.circleRadius === undefined) {
            appSettings.circleRadius = 50;
        }
        isApproachingCircleStart = true;
        currentCircleAngle = 0;
    } else {
        isApproachingCircleStart = false;
    }
    updateSettingsFields();
}

// Обработчик метода Вороного
function handleVoronoiModeToggle() {
    isVoronoiModeActive = !isVoronoiModeActive;

    if (isVoronoiModeActive) {
        resetAllSpecialModesState('voronoi');

        voronoiPathCoordinates = JSON.parse(JSON.stringify(Array.isArray(appSettings.voronoiPoints) ? appSettings.voronoiPoints : []));
        currentVoronoiPathIndex = 0;
        isFlyingVoronoiPath = false;
        droneReachedTargetAltitudeForVoronoiPath = false;
    } else {
    }

    updateSettingsFields();
}

function renderCellularEndpoint() {
    const displayDiv = document.getElementById('cells_endpoint_display');
    const errorDiv = document.getElementById('cells_endpoint_error');
    if (!displayDiv) return;

    if (errorDiv) errorDiv.textContent = '';

    if (appSettings.cellularEndPoint && typeof appSettings.cellularEndPoint.x === 'number' && typeof appSettings.cellularEndPoint.y === 'number') {
        displayDiv.textContent = `Конечная точка: (X: ${appSettings.cellularEndPoint.x}, Y: ${appSettings.cellularEndPoint.y})`;
    } else {
        displayDiv.textContent = 'Конечная точка не установлена.';
    }
}

function setCellularEndpoint() {
    const xInput = document.getElementById('cells_x_input');
    const yInput = document.getElementById('cells_y_input');
    if (!xInput || !yInput) return;

    const x = parseFloat(xInput.value);
    const y = parseFloat(yInput.value);


    if (isNaN(x) || isNaN(y)) {
        openModal('Пожалуйста, введите корректные числовые значения для X и Y.');
        return;
    }

    if (x > -10 && x < 10 && y > -10 && y < 10) {
        openModal('Конечная точка не может быть в диапазоне (X: от -10 до 10, Y: от -10 до 10).');
        appSettings.cellularEndPoint = {x: null, y: null};
    } else {
        appSettings.cellularEndPoint = {x, y};
    }
    renderCellularEndpoint();
}


function handleCellularDecompositionModeToggle() {
    isCellularDecompositionModeActive = !isCellularDecompositionModeActive;

    if (isCellularDecompositionModeActive) {
        resetAllSpecialModesState('cells');


        if (!appSettings.cellularEndPoint) {
            appSettings.cellularEndPoint = {x: null, y: null};
        }
        cellularEndPoint = {...appSettings.cellularEndPoint};
        cellularObstacles = [];
        cellularPathCoordinates = [];
        cellularReturnPathCoordinates = [];
        currentCellularPathIndex = 0;
        isFlyingCellularPath = false;
        droneReachedTargetAltitudeForCellularPath = false;
        isReturningToStartCellular = false;

    } else {
        cellularObstacles = [];
    }

    updateSettingsFields();
    if (!isCellularDecompositionModeActive) {
        initMainGraph(true);
    }
}

// Генерация для клеточной декомпозиции
function generateCellularObstacles() {
    cellularObstacles = [];
    if (!cellularEndPoint || typeof cellularEndPoint.x !== 'number') {
        return;
    }

    const startPoint = {x: 0, y: 0};
    const dist = Math.hypot(cellularEndPoint.x - startPoint.x, cellularEndPoint.y - startPoint.y);

    let numSquares;

    const absX = Math.abs(cellularEndPoint.x);
    const absY = Math.abs(cellularEndPoint.y);

    if (absX <= 20 && absY <= 20) {
        numSquares = 1;
    } else if (absX <= 25 && absY <= 25) {
        numSquares = 2;
    } else {
        const maxDistForMaxSquares = 300;
        const minDistForMinSquaresForElse = 30;

        if (dist < 10) {
            numSquares = 0;
        } else if (dist <= minDistForMinSquaresForElse) {
            if (dist < 15) numSquares = 1;
            else if (dist < 20) numSquares = Math.max(1, 2);
            else numSquares = Math.max(2, 3);
        } else if (dist >= maxDistForMaxSquares) {
            numSquares = 20;
        } else {
            numSquares = 5 + Math.round(15 * (dist - minDistForMinSquaresForElse) / (maxDistForMaxSquares - minDistForMinSquaresForElse));
        }
    }
    numSquares = Math.max(0, Math.min(20, numSquares));


    if (numSquares === 0) {
        initMainGraph(true);
        return;
    }


    const baseSafetyMargin = 15;
    let placedObstaclesCount = 0;
    for (let i = 0; i < numSquares; i++) {
        let obsX, obsY, validPlacement, attempts = 0;
        const MAX_PLACEMENT_ATTEMPTS_PER_OBSTACLE = 20;

        do {
            validPlacement = true;
            let currentSafetyMargin = baseSafetyMargin;
            let progress;

            if (numSquares === 1) {
                progress = 0.4 + Math.random() * 0.2;
                currentSafetyMargin = Math.max(CELL_OBSTACLE_SIZE, dist * 0.1);
            } else if (numSquares <= 2 && dist < 45) {
                progress = 0.4 + Math.random() * 0.2;
                currentSafetyMargin = Math.max(CELL_OBSTACLE_SIZE, dist * 0.1);
            } else {
                progress = Math.random() * 0.6 + 0.2;
            }

            const perpSpread = (Math.random() - 0.5) * (dist / 3);

            const lineVecX = cellularEndPoint.x;
            const lineVecY = cellularEndPoint.y;
            const ux = dist > 0 ? lineVecX / dist : 0;
            const uy = dist > 0 ? lineVecY / dist : 0;

            const px = ux * progress * dist;
            const py = uy * progress * dist;
            obsX = px - uy * perpSpread;
            obsY = py + ux * perpSpread;

            if (Math.hypot(obsX - startPoint.x, obsY - startPoint.y) < currentSafetyMargin ||
                Math.hypot(obsX - cellularEndPoint.x, obsY - cellularEndPoint.y) < currentSafetyMargin + CELL_OBSTACLE_SIZE / 2) {
                validPlacement = false;
            }

            if (validPlacement) {
                for (const ex of cellularObstacles) {
                    if (Math.hypot(obsX - (ex.x + ex.width / 2), obsY - (ex.y - ex.height / 2)) < CELL_OBSTACLE_SIZE * 1.2) {
                        validPlacement = false;
                        break;
                    }
                }
            }
            attempts++;
        } while (!validPlacement && attempts < MAX_PLACEMENT_ATTEMPTS_PER_OBSTACLE);

        if (validPlacement) {
            cellularObstacles.push({
                x: obsX - CELL_OBSTACLE_SIZE / 2,
                y: obsY + CELL_OBSTACLE_SIZE / 2,
                width: CELL_OBSTACLE_SIZE,
                height: CELL_OBSTACLE_SIZE,
                id: `obs-${placedObstaclesCount}`
            });
            placedObstaclesCount++;
        }
    }

    initMainGraph(true);
}

function isCollidingWithObstacles(checkX, checkY, droneRadius = 0.5) {
    if (!isCellularDecompositionModeActive || cellularObstacles.length === 0) {
        return false;
    }
    const safetyClearance = 0.7;

    for (const obs of cellularObstacles) {
        const expandedObsX0 = obs.x - safetyClearance;
        const expandedObsY0 = obs.y - obs.height - safetyClearance;
        const expandedObsX1 = obs.x + obs.width + safetyClearance;
        const expandedObsY1 = obs.y + safetyClearance;

        if (checkX + droneRadius > expandedObsX0 &&
            checkX - droneRadius < expandedObsX1 &&
            checkY + droneRadius > expandedObsY0 &&
            checkY - droneRadius < expandedObsY1) {
            return obs;
        }
    }
    return null;
}

function calculateCellularPath(startPos, targetPos) {
    class Node {
        constructor(x, y, parent = null) {
            this.x = x;
            this.y = y;
            this.parent = parent;
            this.g = 0;
            this.h = 0;
            this.f = 0;
        }
    }

    const gridSize = 2.0;
    const obstacleMargin = 0.8;

    const getGridKey = (x, y) => `${Math.round(x / gridSize)}_${Math.round(y / gridSize)}`;
    const openSet = new Map();
    const closedSet = new Map();

    const startNode = new Node(startPos.x, startPos.y);
    startNode.h = heuristic(startPos, targetPos);
    startNode.f = startNode.h;
    openSet.set(getGridKey(startNode.x, startNode.y), startNode);

    function heuristic(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function isFree(x, y) {
        for (const obs of cellularObstacles) {
            if (x > obs.x - obstacleMargin &&
                x < obs.x + obs.width + obstacleMargin &&
                y > obs.y - obs.height - obstacleMargin &&
                y < obs.y + obstacleMargin) {
                return false;
            }
        }
        return true;
    }

    function getNeighbors(node) {
        const neighbors = [];
        const directions = [
            [0, gridSize], [0, -gridSize],
            [gridSize, 0], [-gridSize, 0],
            [gridSize, gridSize], [gridSize, -gridSize],
            [-gridSize, gridSize], [-gridSize, -gridSize]
        ];

        for (const [dx, dy] of directions) {
            const x = node.x + dx;
            const y = node.y + dy;

            if (isFree(x, y)) {
                neighbors.push(new Node(x, y, node));
            }
        }
        return neighbors;
    }

    let pathFound = false;
    let currentNode = null;

    while (openSet.size > 0) {
        currentNode = Array.from(openSet.values()).reduce((minNode, node) =>
            node.f < minNode.f ? node : minNode, openSet.values().next().value);

        if (heuristic(currentNode, targetPos) < gridSize * 2) {
            pathFound = true;
            break;
        }

        openSet.delete(getGridKey(currentNode.x, currentNode.y));
        closedSet.set(getGridKey(currentNode.x, currentNode.y), currentNode);

        for (const neighbor of getNeighbors(currentNode)) {
            const gridKey = getGridKey(neighbor.x, neighbor.y);

            if (closedSet.has(gridKey)) continue;

            const tentativeG = currentNode.g + heuristic(currentNode, neighbor);

            if (!openSet.has(gridKey) || tentativeG < openSet.get(gridKey).g) {
                neighbor.g = tentativeG;
                neighbor.h = heuristic(neighbor, targetPos);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;

                if (!openSet.has(gridKey)) {
                    openSet.set(gridKey, neighbor);
                }
            }
        }
    }

    const path = [];
    if (pathFound) {
        let node = currentNode;
        while (node) {
            path.unshift({x: node.x, y: node.y});
            node = node.parent;
        }
        path.push(targetPos);
    } else {
        return [];
    }

    return path;
}

// Логика для кнопки информации
const SVG_ICON_PLAY = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16"><path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/></svg>`;
const SVG_ICON_PAUSE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16"><path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/></svg>`;

function setupInfoModalInteractions() {
    const infoStartStopButton = document.getElementById('infoStartStopButton');
    if (infoStartStopButton) {
        infoStartStopButton.isRepresentationPlaying = true;
        infoStartStopButton.innerHTML = SVG_ICON_PLAY;
        infoStartStopButton.style.backgroundColor = '#28a745';

        infoStartStopButton.addEventListener('click', () => {
            infoStartStopButton.isRepresentationPlaying = !infoStartStopButton.isRepresentationPlaying;
            if (infoStartStopButton.isRepresentationPlaying) {
                infoStartStopButton.innerHTML = SVG_ICON_PLAY;
                infoStartStopButton.style.backgroundColor = '#28a745';
            } else {
                infoStartStopButton.innerHTML = SVG_ICON_PAUSE;
                infoStartStopButton.style.backgroundColor = '#dc3545';
            }
        });
    }

    const infoThemeButton = document.getElementById('infoThemeButton');
    if (infoThemeButton) {
        const isAppDarkTheme = document.body.classList.contains('dark-theme');
        infoThemeButton.classList.toggle('dark-active', isAppDarkTheme);

        infoThemeButton.addEventListener('click', () => {
            infoThemeButton.classList.toggle('dark-active');
        });
    }
}

const originalOpenInfoModal = window.openInfoModal;
window.openInfoModal = function () {
    if (typeof originalOpenInfoModal === 'function') {
        originalOpenInfoModal.call(this);
    } else {
        const modal = document.getElementById('infoModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
    setupInfoModalInteractions();
};

function openInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.add('active');
        const startStopRep = modal.querySelector('.info-button-representation-container #startStopButton svg');
        if (startStopRep && startStopRep.classList.contains('bi-pause')) {
            startStopRep.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16"><path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/></svg>`;
        }
    }
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.classList.remove('active', 'closing');
        }, 300);
    }
}

window.addEventListener('click', function (event) {
    const activeModals = document.querySelectorAll('.modal.active');
    activeModals.forEach(modal => {
        if (event.target === modal) {
            if (modal.id === 'infoModal') closeInfoModal();
            else if (modal.id === 'modal') closeModal();
            else if (modal.id === 'createDroneModal') closeCreateModal();
            else if (modal.id === 'settingsModal') {
                const initialH = typeof appSettings !== 'undefined' ? appSettings.heightAboveSea : 0;
                const initialT = typeof appSettings !== 'undefined' ? appSettings.targetAltitude : 3;
                const initialVoronoiPoints = typeof appSettings !== 'undefined' && Array.isArray(appSettings.voronoiPoints) ? JSON.parse(JSON.stringify(appSettings.voronoiPoints)) : [];
                const initialCellularEndPoint = typeof appSettings !== 'undefined' && appSettings.cellularEndPoint ? JSON.parse(JSON.stringify(appSettings.cellularEndPoint)) : {
                    x: null,
                    y: null
                };

                if (typeof appSettings !== 'undefined') {
                    appSettings.heightAboveSea = initialH;
                    appSettings.targetAltitude = initialT;
                    appSettings.voronoiPoints = initialVoronoiPoints;
                    appSettings.cellularEndPoint = initialCellularEndPoint;
                    if (typeof heightAboveSeaLevel !== 'undefined') heightAboveSeaLevel = initialH;
                    if (typeof isFlying !== 'undefined' && isFlying && typeof isLanded !== 'undefined' && !isLanded && typeof targetAltitude !== 'undefined' && targetAltitude !== initialT) {
                        targetAltitude = initialT;
                        if (typeof isAltitudeChanging !== 'undefined') isAltitudeChanging = true;
                    }
                }
                closeSettingsModal();
            } else if (modal.id === 'flightsModal') closeFlightsModal();
        }
    });
});