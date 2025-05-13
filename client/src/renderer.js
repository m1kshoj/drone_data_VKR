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
    voronoiPoints: [], // Crucial: Initialize for Voronoi points
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
const BASE_ASCENT_RATE = 5.0;  // базовая скорость для более быстрого взлета на 250м
const BASE_DESCENT_RATE = 4.0; // Базовая скорость снижения (м/с)
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
    /* Added styles for settings point input */
    .point-input-section {
        border: 1px solid #ccc; /* Use theme-appropriate color later if needed */
        padding: 10px;
        margin-top: 10px;
        border-radius: 4px;
        background-color: rgba(255, 255, 255, 0.05); /* Slight background for dark themes */
    }
    .point-input-section h5 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1em;
        color: inherit; /* Inherit text color from theme */
    }
    .point-input-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
    }
    .point-input-controls input[type="number"] {
        flex-grow: 1;
        width: 70px; /* Adjust as needed */
        padding: 8px;
        border: 1px solid #555; /* Theme-aware border */
        background-color: #333; /* Theme-aware background */
        color: #fff; /* Theme-aware text color */
        border-radius: 4px;
    }
    .point-input-controls button { /* Style for add button */
        padding: 8px 12px;
        /* Assuming .button-primary styles are defined elsewhere or add them */
    }
    .points-list {
        max-height: 100px;
        overflow-y: auto;
        border: 1px solid #444; /* Theme-aware border */
        padding: 8px;
        margin-bottom: 10px;
        font-size: 0.9em;
        background-color: rgba(0,0,0,0.1); /* Slight inner background */
        border-radius: 4px;
    }
    .points-list div {
        padding: 4px 2px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #444; /* Separator for points */
    }
    .points-list div:last-child {
        border-bottom: none;
    }
    .points-list div button { /* Style for remove button */
        margin-left: 10px;
        padding: 2px 8px;
        font-size: 0.8em;
        background-color: #dc3545; /* Red for delete */
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 3px;
    }
    .point-input-section > button.button-danger { /* Style for "Clear all points" */
        width: 100%;
        padding: 8px;
        margin-top: 5px;
    }
    /* Style for active flight mode button */
    .shape-btn.active-flight-mode {
        background-color: #0d6efd; /* Example: Bootstrap primary blue */
        color: white;
        border: 1px solid #0a58ca;
    }
    .shape-btn:disabled {
        background-color: #6c757d; /* Example: Bootstrap secondary/disabled grey */
        color: #ccc;
        cursor: not-allowed;
        opacity: 0.65;
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

let isSquareModeActive = false;
const squarePathCoordinates = [
    {x: 0, y: 50},
    {x: -50, y: 50},
    {x: -50, y: -50},
    {x: 50, y: -50},
    {x: 50, y: 50},
    {x: 0, y: 50},
    {x: 0, y: 0}
];
let currentSquarePathIndex = 0;
let isFlyingSquarePath = false;
const SQUARE_PATH_SPEED = 10;
let droneReachedTargetAltitudeForSquarePath = false;
let controlAltitude = 0;    // опорная высота, по ней считаем посадку/взлёт и флаги

let isCircleModeActive = false;
let isFlyingCirclePath = false;
let droneReachedTargetAltitudeForCirclePath = false;
const CIRCLE_RADIUS = 50;
const CIRCLE_ANGULAR_SPEED = Math.PI / 10;
let currentCircleAngle = 0;

let isApproachingCircleStart = false; // Это верно, когда активен режим круга и дрон должен долететь до начальной точки круга
let currentCircleApproachTarget = null; // Сохраняет цель {x, y} для фазы сближения в режиме круга
const CIRCLE_START_POINT = {x: 0, y: 50}; // Точка, к которой подлетает дрон, прежде чем начать круговое движение. Соответствует первой точке квадрата.
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

let altitudeAnimationFrameId = null;
let droneAnimationFrameId = null;

function toggleStartStop() {
    const startStopButton = document.getElementById('startStopButton');
    if (!startStopButton) return;

    isFlying = !isFlying;

    if (isFlying) {
        if (altitude <= 0.1) {
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
    Plotly.react(graphId, data, finalLayout, plotlyConfig).catch(e => console.error(`Ошибка (${graphId}):`, e));
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
            isFlyingSquarePath = true;
            const targetPos = squarePathCoordinates[currentSquarePathIndex];
            const dX_sq = targetPos.x - newX;
            const dY_sq = targetPos.y - newY;
            const dist_sq = Math.hypot(dX_sq, dY_sq);
            const step_sq = SQUARE_PATH_SPEED * effectiveDeltaTime;
            if (dist_sq <= step_sq) {
                newX = targetPos.x;
                newY = targetPos.y;
                currentSquarePathIndex++;
                if (currentSquarePathIndex >= (squarePathCoordinates.length - 1)) {
                    currentSquarePathIndex = 0;
                }
            } else {
                newX += dX_sq / dist_sq * step_sq;
                newY += dY_sq / dist_sq * step_sq;
            }
        } else if (isCircleModeActive && isFlying) {
            if (isApproachingCircleStart) {
                currentCircleApproachTarget = CIRCLE_START_POINT;
                const dX_c_app = currentCircleApproachTarget.x - newX;
                const dY_c_app = currentCircleApproachTarget.y - newY;
                const dist_c_app = Math.hypot(dX_c_app, dY_c_app);
                const step_c_app = CIRCLE_APPROACH_SPEED * effectiveDeltaTime;
                if (dist_c_app <= step_c_app) {
                    newX = currentCircleApproachTarget.x;
                    newY = currentCircleApproachTarget.y;
                    isApproachingCircleStart = false;
                    isFlyingCirclePath = true;
                    currentCircleAngle = Math.atan2(newY, newX);
                } else {
                    newX += dX_c_app / dist_c_app * step_c_app;
                    newY += dY_c_app / dist_c_app * step_c_app;
                }
            } else if (isFlyingCirclePath) {
                const dAngle = CIRCLE_ANGULAR_SPEED * effectiveDeltaTime;
                currentCircleAngle += dAngle;
                newX = CIRCLE_RADIUS * Math.cos(currentCircleAngle);
                newY = CIRCLE_RADIUS * Math.sin(currentCircleAngle);
                if (currentCircleAngle >= (Math.PI * 2)) {
                    currentCircleAngle -= (Math.PI * 2);
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
    if (!lastPathPoint || lastPathPoint.x !== x || lastPathPoint.y !== y) {
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
            if (!isCellularDecompositionModeActive) {
                const currentLayout = mainGraphDiv.layout;
                const xRange = currentLayout.xaxis.range;
                const yRange = currentLayout.yaxis.range;
                const padding = 20;
                let newXRange = [...xRange];
                let newYRange = [...yRange];
                if (x < xRange[0] + padding / 2 || x > xRange[1] - padding / 2 ||
                    y < yRange[0] + padding / 2 || y > yRange[1] - padding / 2 ||
                    xRange[1] - xRange[0] < 2 * padding || yRange[1] - yRange[0] < 2 * padding) {
                    const targetXSpan = Math.max(Math.abs(x) * 0.4 + 2 * padding, 100);
                    const targetYSpan = Math.max(Math.abs(y) * 0.4 + 2 * padding, 100);
                    newXRange = [x - targetXSpan / 2, x + targetXSpan / 2];
                    newYRange = [y - targetYSpan / 2, y + targetYSpan / 2];
                    Plotly.relayout('main-graph', {
                        'xaxis.range': newXRange,
                        'yaxis.range': newYRange
                    }).catch(e => console.error("Ошибка авто-масштабирования:", e));
                }
            }
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
            let voronoiSettingsSection = modal.querySelector('#voronoi_settings_section');
            if (!voronoiSettingsSection) {
                voronoiSettingsSection = createPointInputSectionHTML('voronoi', 'Метод Вороного');
                const graphSettingsSection = Array.from(form.children).find(child => child.classList.contains('settings-section') && child.querySelector('h4.section-title')?.textContent.includes('Настройки графиков'));
                if (graphSettingsSection) {
                    form.insertBefore(voronoiSettingsSection, graphSettingsSection);
                } else {
                    form.appendChild(voronoiSettingsSection);
                }
            }

            let cellsSettingsSection = modal.querySelector('#cells_settings_section');
            if (!cellsSettingsSection) {
                cellsSettingsSection = createPointInputSectionHTML('cells', 'Клеточная декомпозиция');
                const graphSettingsSection = Array.from(form.children).find(child => child.classList.contains('settings-section') && child.querySelector('h4.section-title')?.textContent.includes('Настройки графиков'));
                if (graphSettingsSection) {
                    form.insertBefore(cellsSettingsSection, graphSettingsSection);
                } else {
                    form.appendChild(cellsSettingsSection);
                }
            }
        }


        updateSettingsFields();
        setupSettingsInputHandlers();

        setTimeout(() => modal.classList.add('active'), 10);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeSettingsModal();
        });
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
            <div id="${modePrefix}_endpoint_error" class="error-message" style="color: red; font-size: 0.9em; margin-top: 5px;"></div>
        `;
    } else {
        section.innerHTML = `
            <h5 class="section-title">Координаты для "${title}"</h5>
            <div class="point-input-controls">
                <input type="number" id="${modePrefix}_x_input" placeholder="X">
                <input type="number" id="${modePrefix}_y_input" placeholder="Y">
                <button type="button" id="add_${modePrefix}_point_btn" class="button-primary">Добавить</button>
            </div>
            <div id="${modePrefix}_points_list" class="points-list"></div>
            <button type="button" id="clear_${modePrefix}_points_btn" class="button-danger">Очистить все точки</button>
        `;
    }
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
    if (hi) hi.value = appSettings.heightAboveSea;
    if (ta) ta.value = appSettings.targetAltitude;

    updateCalculatedValues(appSettings.heightAboveSea);

    const allModeButtons = modal.querySelectorAll('.shape-btn');
    const activeModeButtonClass = 'active-flight-mode';

    const squareBtn = modal.querySelector('.shape-btn[data-shape="square"]');
    const circleBtn = modal.querySelector('.shape-btn[data-shape="circle"]');
    const voronoiBtn = modal.querySelector('.shape-btn[data-shape="voronoi"]');
    const cellsBtn = modal.querySelector('.shape-btn[data-shape="cells"]');

    const voronoiSettingsSection = modal.querySelector('#voronoi_settings_section');
    const cellsSettingsSection = modal.querySelector('#cells_settings_section');

    allModeButtons.forEach(btn => btn.classList.remove(activeModeButtonClass));
    allModeButtons.forEach(btn => btn.disabled = false);

    if (voronoiSettingsSection) voronoiSettingsSection.style.display = 'none';
    if (cellsSettingsSection) cellsSettingsSection.style.display = 'none';


    let aModeIsActive = false;
    if (isSquareModeActive) {
        if (squareBtn) squareBtn.classList.add(activeModeButtonClass);
        aModeIsActive = true;
    } else if (isCircleModeActive) {
        if (circleBtn) circleBtn.classList.add(activeModeButtonClass);
        aModeIsActive = true;
    } else if (isVoronoiModeActive) {
        if (voronoiBtn) voronoiBtn.classList.add(activeModeButtonClass);
        if (voronoiSettingsSection) voronoiSettingsSection.style.display = 'block';
        renderPointsList('voronoi', Array.isArray(appSettings.voronoiPoints) ? appSettings.voronoiPoints : []);
        aModeIsActive = true;
    } else if (isCellularDecompositionModeActive) {
        if (cellsBtn) cellsBtn.classList.add(activeModeButtonClass);
        if (cellsSettingsSection) cellsSettingsSection.style.display = 'block';
        renderCellularEndpoint();
        aModeIsActive = true;
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

    const initialH = appSettings.heightAboveSea;
    const initialT = appSettings.targetAltitude;
    const initialVoronoiPoints = JSON.parse(JSON.stringify(Array.isArray(appSettings.voronoiPoints) ? appSettings.voronoiPoints : []));
    const initialCellularEndPoint = appSettings.cellularEndPoint ?
        JSON.parse(JSON.stringify(appSettings.cellularEndPoint)) : {
            x: null,
            y: null
        };

    const hi = modal.querySelector('#height_above_sea');
    const ta = modal.querySelector('#target_altitude');
    const saveBtn = modal.querySelector('#saveSettingsBtn');
    const cancelBtn = modal.querySelector('#cancelSettingsBtn');
    const defBtn = modal.querySelector('.defaults-btn');

    const sqBtn = modal.querySelector('.shape-btn[data-shape="square"]');
    const circleBtn = modal.querySelector('.shape-btn[data-shape="circle"]');
    const voronoiBtn = modal.querySelector('.shape-btn[data-shape="voronoi"]');
    const cellsBtn = modal.querySelector('.shape-btn[data-shape="cells"]');

    if (hi) hi.addEventListener('input', () => updateCalculatedValues());

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

        appSettings.heightAboveSea = newH;
        heightAboveSeaLevel = newH;

        if (newT !== appSettings.targetAltitude) {
            if (isSquareModeActive) droneReachedTargetAltitudeForSquarePath = false;
            if (isCircleModeActive) droneReachedTargetAltitudeForCirclePath = false;
            if (isVoronoiModeActive) droneReachedTargetAltitudeForVoronoiPath = false;
            if (isCellularDecompositionModeActive) droneReachedTargetAltitudeForCellularPath = false;
            console.log("Целевая высота изменена. Дрон будет корректировать.");
        }

        appSettings.targetAltitude = newT;
        if (isFlying && !isLanded) {
            if (targetAltitude !== newT) {
                targetAltitude = newT;
                isAltitudeChanging = true;
                if (isSquareModeActive) droneReachedTargetAltitudeForSquarePath = false;
                if (isCircleModeActive) droneReachedTargetAltitudeForCirclePath = false;
                if (isVoronoiModeActive) droneReachedTargetAltitudeForVoronoiPath = false;
                if (isCellularDecompositionModeActive) droneReachedTargetAltitudeForCellularPath = false;
            }
        }
        appSettings.lastUpdated = new Date();
        updateCalculatedValues(newH);

        if (isVoronoiModeActive) {
            if (!appSettings.voronoiPoints || appSettings.voronoiPoints.length < 2) {
                openModal('Для активации режима Вороного необходимо как минимум 2 точки. Пожалуйста, добавьте точки или выберите другой режим.');
                return;
            }
            if (appSettings.voronoiPoints.length > 10) {
                openModal('Для метода Вороного можно использовать максимум 10 точек.');
                return;
            }

            voronoiPathCoordinates = JSON.parse(JSON.stringify(Array.isArray(appSettings.voronoiPoints) ? appSettings.voronoiPoints : []));
            if (isFlying) {
                currentVoronoiPathIndex = 0;
                isFlyingVoronoiPath = false;
                droneReachedTargetAltitudeForVoronoiPath = false;
                voronoiTwoPointReturningToOrigin = false;
                voronoiReturnToOriginAfterCycle = false;
            }
        }

        if (isCellularDecompositionModeActive) {
            if (appSettings.cellularEndPoint && typeof appSettings.cellularEndPoint.x === 'number') {
                cellularEndPoint = {...appSettings.cellularEndPoint};
                generateCellularObstacles();
                cellularPathCoordinates = [];
                cellularReturnPathCoordinates = [];
                currentCellularPathIndex = 0;
                isReturningToStartCellular = false;
                if (isFlying) {
                    droneReachedTargetAltitudeForCellularPath = false;
                    isFlyingCellularPath = false;
                }
                initMainGraph(true);
                console.log("Настройки клеточной декомпозиции сохранены, препятствия сгенерированы/обновлены.");
            } else {
                openModal("Ошибка: Конечная точка для клеточной декомпозиции не установлена корректно.");
                return;
            }
        }
        closeSettingsModal();
    });

    if (cancelBtn) cancelBtn.addEventListener('click', () => {
        appSettings.heightAboveSea = initialH;
        appSettings.targetAltitude = initialT;
        appSettings.voronoiPoints = JSON.parse(JSON.stringify(initialVoronoiPoints));
        appSettings.cellularEndPoint = JSON.parse(JSON.stringify(initialCellularEndPoint));
        heightAboveSeaLevel = initialH;
        if (isFlying && !isLanded && targetAltitude !== initialT) {
            targetAltitude = initialT;
            isAltitudeChanging = true;
        }

        closeSettingsModal();
    });

    if (defBtn) defBtn.addEventListener('click', () => {
        if (hi) hi.value = 0;
        if (ta) ta.value = INITIAL_TAKEOFF_ALTITUDE;
        appSettings.voronoiPoints = [];
        renderPointsList('voronoi', appSettings.voronoiPoints);
        appSettings.cellularEndPoint = {x: null, y: null};
        renderCellularEndpoint();

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
    }
    if (exceptMode !== 'circle') {
        isCircleModeActive = false;
        isFlyingCirclePath = false;
        droneReachedTargetAltitudeForCirclePath = false;
        isApproachingCircleStart = true;
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
    } else {
    }
    updateSettingsFields();
}

function handleCircleModeToggle() {
    isCircleModeActive = !isCircleModeActive;
    if (isCircleModeActive) {
        resetAllSpecialModesState('circle');
        isApproachingCircleStart = true;
        currentCircleAngle = 0;
    } else {
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
    const errorDiv = document.getElementById('cells_endpoint_error');

    if (!xInput || !yInput || !errorDiv) return;

    const x = parseFloat(xInput.value);
    const y = parseFloat(yInput.value);

    errorDiv.textContent = '';

    if (isNaN(x) || isNaN(y)) {
        errorDiv.textContent = 'Пожалуйста, введите корректные числовые значения для X и Y.';
        return;
    }

    if (x > -10 && x < 10 && y > -10 && y < 10) {
        errorDiv.textContent = 'Конечная точка не может быть в диапазоне (X: от -10 до 10, Y: от -10 до 10).';
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