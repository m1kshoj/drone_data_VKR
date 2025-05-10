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
                isPathPausedForLanding = false;
                landingSequenceActiveInMode = false;
                isReturningToPathAfterLandingCancel = false;
                dronePathBeforeLanding = null;

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
                isPathPausedForLanding = false;
                landingSequenceActiveInMode = false;
                isReturningToPathAfterLandingCancel = false;
                dronePathBeforeLanding = null;
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

        isPathPausedForLanding = false;
        landingSequenceActiveInMode = false;
        isReturningToPathAfterLandingCancel = false;
        dronePathBeforeLanding = null;
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

    const currentX = reset || !path || path.length === 0 ? 0 : path[path.length - 1].x;
    const currentY = reset || !path || path.length === 0 ? 0 : path[path.length - 1].y;

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

let lastPositionUpdate = 0;и
let lastAltitudeUpdate = 0;
let lastPlotlyUpdateTimeGraphs = 0;

const PLOTLY_UPDATE_INTERVAL_TIME = 10;

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

    // Движение при специальных состояниях (посадка, возврат на путь)
    if (landingSequenceActiveInMode && !isReturningToPathAfterLandingCancel) {
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
    } else if (isReturningToPathAfterLandingCancel) {
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
                if (Math.abs(altitude - dronePathBeforeLanding.altitudeBeforeLanding) < 0.5 && !isAltitudeChanging) {
                    console.log("Position and altitude restored after landing cancellation. Resuming path.");
                    isReturningToPathAfterLandingCancel = false;
                    isPathPausedForLanding = false;

                    if (dronePathBeforeLanding.modeState.type === 'square') {
                        currentSquarePathIndex = dronePathBeforeLanding.modeState.index;
                        droneReachedTargetAltitudeForSquarePath = dronePathBeforeLanding.modeState.reachedAlt;
                        isFlyingSquarePath = dronePathBeforeLanding.modeState.isFlying;
                    } else if (dronePathBeforeLanding.modeState.type === 'circle') {
                        currentCircleAngle = dronePathBeforeLanding.modeState.angle;
                        droneReachedTargetAltitudeForCirclePath = dronePathBeforeLanding.modeState.reachedAlt;
                        isApproachingCircleStart = dronePathBeforeLanding.modeState.isApproaching;
                        currentCircleApproachTarget = dronePathBeforeLanding.modeState.approachTarget;
                        isFlyingCirclePath = dronePathBeforeLanding.modeState.isFlying;
                    }
                    dronePathBeforeLanding = null;
                }
            } else {
                newX += dX_return / dist_return * step_return;
                newY += dY_return / dist_return * step_return;
            }
        } else {
            isReturningToPathAfterLandingCancel = false;
            isPathPausedForLanding = false;
        }
    } else if (isPathPausedForLanding || (isLanded && !(isSquareModeActive || isCircleModeActive))) {
    }
    else if (!isLanded) {
        if (isSquareModeActive && droneReachedTargetAltitudeForSquarePath) {
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
                    console.log("Square path loop.");
                }
            } else {
                newX += dX_sq / dist_sq * step_sq;
                newY += dY_sq / dist_sq * step_sq;
            }
        } else if (isCircleModeActive && droneReachedTargetAltitudeForCirclePath) {
            if (isApproachingCircleStart) {
                currentCircleApproachTarget = CIRCLE_START_POINT;
                const dX_circle_approach = currentCircleApproachTarget.x - newX;
                const dY_circle_approach = currentCircleApproachTarget.y - newY;
                const dist_circle_approach = Math.hypot(dX_circle_approach, dY_circle_approach);
                const step_circle_approach = CIRCLE_APPROACH_SPEED * effectiveDeltaTime;

                if (dist_circle_approach <= step_circle_approach) {
                    newX = currentCircleApproachTarget.x;
                    newY = currentCircleApproachTarget.y;
                    isApproachingCircleStart = false;
                    isFlyingCirclePath = true;
                    currentCircleAngle = 0;
                    console.log("Reached circle start point. Starting circular path.");
                } else {
                    newX += dX_circle_approach / dist_circle_approach * step_circle_approach;
                    newY += dY_circle_approach / dist_circle_approach * step_circle_approach;
                }
            } else {
                isFlyingCirclePath = true;
                const dAngle = CIRCLE_ANGULAR_SPEED * effectiveDeltaTime;
                currentCircleAngle += dAngle;

                newX = CIRCLE_RADIUS * Math.sin(currentCircleAngle);
                newY = CIRCLE_RADIUS * Math.cos(currentCircleAngle);

                if (currentCircleAngle >= (Math.PI * 2)) {
                    currentCircleAngle -= (Math.PI * 2);
                    console.log("Circle path loop.");
                }
            }
        } else if (!(isSquareModeActive || isCircleModeActive)) {
            const moveStep = 5.0;
            newX += speedX * moveStep * effectiveDeltaTime;
            newY += speedY * moveStep * effectiveDeltaTime;

            const limit = 100;
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
        const pathLineData = {
            x: [path.map(p => p.x)],
            y: [path.map(p => p.y)]
        };
        const currentPositionMarkerData = {
            x: [[x]],
            y: [[y]]
        };
        Plotly.restyle('main-graph', pathLineData, [1]).catch(e => console.error("Plotly restyle path error:", e));
        Plotly.restyle('main-graph', currentPositionMarkerData, [2]).catch(e => console.error("Plotly restyle marker error:", e));

        const mainGraphDiv = document.getElementById('main-graph');
        if (mainGraphDiv && mainGraphDiv.layout && mainGraphDiv.layout.xaxis && mainGraphDiv.layout.yaxis) {
            const currentLayout = mainGraphDiv.layout;
            const xRange = currentLayout.xaxis.range;
            const yRange = currentLayout.yaxis.range;
            const padding = 20;
            const zoomOutFactor = 1.5;

            let needsRelayout = false;
            const newXRange_plot = [...xRange];
            const newYRange_plot = [...yRange];

            if (x + padding > newXRange_plot[1]) {
                newXRange_plot[1] = x + padding * zoomOutFactor;
                needsRelayout = true;
            }
            if (x - padding < newXRange_plot[0]) {
                newXRange_plot[0] = x - padding * zoomOutFactor;
                needsRelayout = true;
            }
            if (y + padding > newYRange_plot[1]) {
                newYRange_plot[1] = y + padding * zoomOutFactor;
                needsRelayout = true;
            }
            if (y - padding < newYRange_plot[0]) {
                newYRange_plot[0] = y - padding * zoomOutFactor;
                needsRelayout = true;
            }

            const minViewSpan = 50;
            if (newXRange_plot[1] - newXRange_plot[0] < minViewSpan) {
                const midX = (newXRange_plot[0] + newXRange_plot[1]) / 2;
                newXRange_plot[0] = midX - minViewSpan / 2;
                newXRange_plot[1] = midX + minViewSpan / 2;
                needsRelayout = true;
            }
            if (newYRange_plot[1] - newYRange_plot[0] < minViewSpan) {
                const midY = (newYRange_plot[0] + newYRange_plot[1]) / 2;
                newYRange_plot[0] = midY - minViewSpan / 2;
                newYRange_plot[1] = midY + minViewSpan / 2;
                needsRelayout = true;
            }

            if (needsRelayout) {
                Plotly.relayout('main-graph', {
                    'xaxis.range': newXRange_plot,
                    'yaxis.range': newYRange_plot,
                    'yaxis.scaleanchor': "x",
                    'yaxis.scaleratio': 1
                }).catch(e => console.error("Plotly relayout error:", e));
            }
        }
    }
    droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
}

async function updateAltitude(timestamp) {
    if (!isFlying || altitudeAnimationFrameId === null) {
        if (altitudeAnimationFrameId !== null && !isFlying) {
            altitudeAnimationFrameId = null;
        }
        return;
    }

    if (isReturningToPathAfterLandingCancel && dronePathBeforeLanding) {
        if (Math.abs(altitude - dronePathBeforeLanding.altitudeBeforeLanding) < 0.5 && !isAltitudeChanging) {
        }
    }

    if (isSquareModeActive) {
        if (!droneReachedTargetAltitudeForSquarePath && !isAltitudeChanging && !isLanded) {
            droneReachedTargetAltitudeForSquarePath = true;
            console.log("Initial target altitude reached for Square Mode path start.");
        }
    }

    if (isCircleModeActive) {
        if (!droneReachedTargetAltitudeForCirclePath && !isAltitudeChanging && !isLanded) {
            droneReachedTargetAltitudeForCirclePath = true;
            console.log("Initial target altitude reached for Circle Mode. Approach/path will start if conditions met.");
        }
    }

    const deltaTime = (timestamp - lastAltitudeUpdate) / 1000.0;
    if (deltaTime > 0 && deltaTime < 0.5) {
        time += deltaTime;
        const diff = targetAltitude - controlAltitude;

        if (Math.abs(diff) > 0.1) {
            if (!isAltitudeChanging) isAltitudeChanging = true;
            const factor = Math.max(0.1, Math.min(1, Math.abs(diff) / 50));
            const dir = Math.sign(diff);
            const rate = dir > 0 ? BASE_ASCENT_RATE * factor : BASE_DESCENT_RATE * factor;
            const step = dir * rate * deltaTime;

            if (Math.abs(step) >= Math.abs(diff)) {
                controlAltitude = targetAltitude;
                isAltitudeChanging = false;
                if (targetAltitude <= 0.1 && !isLanded) {
                    isLanded = true;
                    console.log("Дрон приземлился.");
                }
                if (isReturningToPathAfterLandingCancel && dronePathBeforeLanding &&
                    Math.abs(controlAltitude - dronePathBeforeLanding.altitudeBeforeLanding) < 0.1) {
                    console.log("Target altitude for path resumption reached.");
                }
            } else {
                controlAltitude += step;
            }
        } else if (isAltitudeChanging) {
            controlAltitude = targetAltitude;
            isAltitudeChanging = false;
            if (targetAltitude <= 0.1 && !isLanded) {
                isLanded = true;
                console.log("Дрон приземлился (snapped).");
            }
            if (isReturningToPathAfterLandingCancel && dronePathBeforeLanding &&
                Math.abs(controlAltitude - dronePathBeforeLanding.altitudeBeforeLanding) < 0.1) {
                console.log("Target altitude for path resumption reached (snapped).");
            }
        }

        if (controlAltitude < 0) controlAltitude = 0;
        if (isLanded) controlAltitude = 0;

        if (!isAltitudeChanging && !isLanded && !landingSequenceActiveInMode && !isReturningToPathAfterLandingCancel) {
            const minAlt = 5, maxAlt = 1000;
            const minAmp = 0.3, maxAmp = 3;
            const h_osc = Math.min(Math.max(controlAltitude, minAlt), maxAlt);
            const noiseAmp = minAmp + (maxAmp - minAmp) * (h_osc - minAlt) / (maxAlt - minAlt);
            const rawNoise = (Math.random() * 2 - 1) * noiseAmp;
            smoothedOscillation = smoothedOscillation * (1 - OSCILLATION_SMOOTHING_FACTOR)
                + rawNoise * OSCILLATION_SMOOTHING_FACTOR;
        } else {
            smoothedOscillation = 0;
        }

        altitude = controlAltitude + (isLanded ? 0 : smoothedOscillation);
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
                Plotly.extendTraces('altitude-graph', {x: [[altitudeData.x[i]]], y: [[altitudeData.y[i]]]}, [0]);
                Plotly.extendTraces('temperature-graph', {
                    x: [[temperatureData.x[i]]],
                    y: [[temperatureData.y[i]]]
                }, [0]);
                Plotly.extendTraces('pressure-graph', {x: [[pressureData.x[i]]], y: [[pressureData.y[i]]]}, [0]);
            }

            const gd_alt_div = document.getElementById('altitude-graph');
            if (gd_alt_div && gd_alt_div.layout && gd_alt_div.layout.xaxis) {
                const current_alt_layout = gd_alt_div.layout;
                const range_alt = current_alt_layout.xaxis.range || [0, GRAPH_WINDOW_SIZE];
                const lastT_alt = i >= 0 ? altitudeData.x[i] : 0;

                if (lastT_alt > range_alt[1]) {
                    const newR_alt = [lastT_alt - GRAPH_WINDOW_SIZE + PLOTLY_UPDATE_INTERVAL_TIME / 1000, lastT_alt + PLOTLY_UPDATE_INTERVAL_TIME / 1000];
                    await Plotly.relayout('altitude-graph', {'xaxis.range': newR_alt});
                    await Plotly.relayout('temperature-graph', {'xaxis.range': newR_alt});
                    await Plotly.relayout('pressure-graph', {'xaxis.range': newR_alt});
                } else if (range_alt[0] !== 0 && lastT_alt <= GRAPH_WINDOW_SIZE && lastT_alt > 0) {
                    const init_alt = [0, GRAPH_WINDOW_SIZE];
                    await Plotly.relayout('altitude-graph', {'xaxis.range': init_alt});
                    await Plotly.relayout('temperature-graph', {'xaxis.range': init_alt});
                    await Plotly.relayout('pressure-graph', {'xaxis.range': init_alt});
                }
            }
        }
        lastAltitudeUpdate = timestamp;
    }

    altitudeAnimationFrameId = isFlying
        ? requestAnimationFrame(updateAltitude)
        : null;
}

// Функции управления высотой
function increaseAltitude() {
    if (!isFlying) return;

    if (isLanded) {
        if (isSquareModeActive || isCircleModeActive) {
            console.log("Altitude Up (E) pressed while landed in Special Mode. Small liftoff, path continues.");
            isLanded = false;
            isAltitudeChanging = true;

            const currentActualAltitudeForIncrement = 0;
            const step = Math.max(1, Math.round(currentActualAltitudeForIncrement / 100));
            const increment = Math.min(50, step);

            targetAltitude = (altitude > 0.1 ? altitude : 0) + increment;
            console.log(`E-Takeoff (Special Mode): New Target: ${targetAltitude.toFixed(1)}. Path should continue.`);

            if (altitudeAnimationFrameId === null && isFlying) {
                lastAltitudeUpdate = performance.now();
                altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
            }
            return;
        } else {
            console.log("Increase altitude (E) pressed while landed (Standard Mode or not in special mode). Initiating standard takeoff procedure.");
            _initiateTakeoff(true);
            return;
        }
    }

    const currentTarget = isAltitudeChanging ? targetAltitude : altitude;
    const step = Math.max(1, Math.round(currentTarget / 100));
    const altitudeIncrement = Math.min(50, step);
    targetAltitude = Math.min(currentTarget + altitudeIncrement, 10000);
    console.log(`Increasing altitude. Current: ${altitude.toFixed(1)}, New Target: ${targetAltitude.toFixed(1)}`);
    isAltitudeChanging = true;

    if (altitudeAnimationFrameId === null && isFlying) {
        lastAltitudeUpdate = performance.now();
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
    }
}

function decreaseAltitude() {
    if (!isFlying) return;
    if (isLanded && targetAltitude <= 0.1) {
        console.log("Cannot decrease altitude: Already landed and target is effectively zero.");
        return;
    }

    const currentActualAltitude = altitude;
    const currentTargetVal = isAltitudeChanging ? targetAltitude : altitude;
    const step = Math.max(1, Math.round(currentTargetVal / 100));
    const altitudeDecrement = Math.min(50, step);
    const newCalculatedTargetAltitude = Math.max(currentTargetVal - altitudeDecrement, 0);

    if (newCalculatedTargetAltitude <= 0.1 && currentTargetVal > 0.1 && !isLanded) {
        lastAltitudeBeforeLanding = currentActualAltitude;
        console.log(`Q-Descent leading to land: Storing lastAltitudeBeforeLanding = ${lastAltitudeBeforeLanding.toFixed(1)}`);
    }

    targetAltitude = newCalculatedTargetAltitude;
    console.log(`Decreasing altitude. Current: ${altitude.toFixed(1)}, New Target: ${targetAltitude.toFixed(1)}`);
    isAltitudeChanging = true;

    if (targetAltitude <= 0.1 && !isLanded) {
        console.log("Targeting ground with decreaseAltitude button. This will be a manual landing.");
    }

    if (altitudeAnimationFrameId === null && isFlying) {
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

    if (isSquareModeActive || isCircleModeActive) {
        if (landingSequenceActiveInMode) {
            console.log("Special Mode: Landing cancel requested. Returning to previous path and altitude.");
            if (dronePathBeforeLanding) {
                targetAltitude = dronePathBeforeLanding.altitudeBeforeLanding;
                isAltitudeChanging = true;
                isReturningToPathAfterLandingCancel = true;
                landingSequenceActiveInMode = false;
                isPathPausedForLanding = true;
                isLanded = false;
            } else {
                console.warn("Special Mode: Landing cancel pressed, but no previous path data. Taking off to default alt.");
                _initiateTakeoff(false);
            }
        } else if (!isLanded) {
            console.log("Special Mode: Landing initiated. Storing current state and returning to origin (0,0).");
            dronePathBeforeLanding = {
                x: x, y: y, altitudeBeforeLanding: altitude, modeState: {}
            };
            if (isSquareModeActive) {
                dronePathBeforeLanding.modeState = { type: 'square', index: currentSquarePathIndex, isFlying: isFlyingSquarePath, reachedAlt: droneReachedTargetAltitudeForSquarePath };
            } else if (isCircleModeActive) {
                dronePathBeforeLanding.modeState = { type: 'circle', angle: currentCircleAngle, isFlying: isFlyingCirclePath, reachedAlt: droneReachedTargetAltitudeForCirclePath, isApproaching: isApproachingCircleStart, approachTarget: currentCircleApproachTarget };
            }
            lastAltitudeBeforeLanding = altitude;
            targetAltitude = 0;
            isAltitudeChanging = true;
            landingSequenceActiveInMode = true;
            isPathPausedForLanding = true;
            isReturningToPathAfterLandingCancel = false;
        } else {

            if (dronePathBeforeLanding) {
                console.log("Special Mode: Takeoff by L after SPECIAL L-landing (drone at 0,0). Path restart from origin.");
                _initiateTakeoff(false);
                dronePathBeforeLanding = null;
            } else {
                console.log("Special Mode: Takeoff by L (after Q-land or initial on path). Target: lastAltitudeBeforeLanding.");

                let takeoffAltitude;
                if (lastAltitudeBeforeLanding > 1) {
                    takeoffAltitude = lastAltitudeBeforeLanding;
                    console.log(`L-Takeoff (Q-land/initial): Target altitude set to last remembered: ${takeoffAltitude.toFixed(1)}`);
                } else {
                    takeoffAltitude = INITIAL_TAKEOFF_ALTITUDE;
                    console.log(`L-Takeoff (Q-land/initial): lastAltitudeBeforeLanding was <=1 or uninitialized, using INITIAL_TAKEOFF_ALTITUDE: ${takeoffAltitude.toFixed(1)}`);
                }

                targetAltitude = takeoffAltitude;
                isLanded = false;
                isAltitudeChanging = true;
                landingSequenceActiveInMode = false;
                isReturningToPathAfterLandingCancel = false;
                isPathPausedForLanding = false;

                if (isSquareModeActive) {
                    isFlyingSquarePath = false;
                    droneReachedTargetAltitudeForSquarePath = false;
                }
                if (isCircleModeActive) {
                    isFlyingCirclePath = false;
                    droneReachedTargetAltitudeForCirclePath = false;
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
        return;
    }

    // Стандартный режим
    if (isLanded) {
        console.log("Standard Mode: Takeoff initiated.");
        targetAltitude = lastAltitudeBeforeLanding > 1 ? lastAltitudeBeforeLanding : INITIAL_TAKEOFF_ALTITUDE;
        isLanded = false;
        isAltitudeChanging = true;
    } else {
        console.log("Standard Mode: Landing initiated.");
        if (altitude > 0.1) lastAltitudeBeforeLanding = altitude;
        else lastAltitudeBeforeLanding = INITIAL_TAKEOFF_ALTITUDE;
        targetAltitude = 0;
        isAltitudeChanging = true;
    }

    if (altitudeAnimationFrameId === null && isFlying) { lastAltitudeUpdate = performance.now(); altitudeAnimationFrameId = requestAnimationFrame(updateAltitude); }
    if (droneAnimationFrameId === null && isFlying) { lastPositionUpdate = performance.now(); droneAnimationFrameId = requestAnimationFrame(updateDronePosition); }
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
        }
        isFlyingSquarePath = false;
        droneReachedTargetAltitudeForSquarePath = false;
    }
    if (isCircleModeActive) {
        if (!isResumeFromCurrentPositionInMode) {
            isApproachingCircleStart = true;
            currentCircleAngle = 0;
        } else {
            isApproachingCircleStart = false;
        }
        isFlyingCirclePath = false;
        droneReachedTargetAltitudeForCirclePath = false;
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


    currentSquarePathIndex = 0;
    isFlyingSquarePath = false;
    droneReachedTargetAltitudeForSquarePath = false;
    console.log("Square mode state reset during graph clearing.");

    isFlyingCirclePath = false;
    droneReachedTargetAltitudeForCirclePath = false;
    currentCircleAngle = 0;
    isApproachingCircleStart = true;
    currentCircleApproachTarget = null;
    console.log("Circle mode flight parameters reset on clear.");

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
        if (isFlying) isFlying = false;
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
    if (isSquareModeActive) {
        console.log("Manual control disabled in Square Mode.");
        return;
    }
    if (isFlying && !isLanded) speedY = 1;
}

function moveBackward() {
    if (isSquareModeActive) {
        console.log("Manual control disabled in Square Mode.");
        return;
    }
    if (isFlying && !isLanded) speedY = -1;
}

function moveLeft() {
    if (isSquareModeActive) {
        console.log("Manual control disabled in Square Mode.");
        return;
    }
    if (isFlying && !isLanded) speedX = -1;
}

function moveRight() {
    if (isSquareModeActive) {
        console.log("Manual control disabled in Square Mode.");
        return;
    }
    if (isFlying && !isLanded) speedX = 1;
}


// Обработчики нажатия и отпускания клавиш
document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.repeat) {
        return;
    }

    if (isSquareModeActive && isFlying && !isLanded) {
        if (event.code !== 'KeyQ' && event.code !== 'KeyE' && event.code !== 'KeyL') {
            console.log("Keyboard control disabled in Square Mode.");
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
    const hi = modal.querySelector('#height_above_sea');
    const ta = modal.querySelector('#target_altitude');
    hi.value = appSettings.heightAboveSea;
    ta.value = appSettings.targetAltitude;
    updateCalculatedValues(appSettings.heightAboveSea);
    const circleBtn = modal.querySelector('.shape-btn[data-shape="circle"]');
    const otherBtns = modal.querySelectorAll('.shape-btn:not([data-shape="circle"])');
    if (isCircleModeActive) {
        circleBtn.classList.add('active-flight-mode');
        otherBtns.forEach(b => b.disabled = true);
    } else {
        circleBtn.classList.remove('active-flight-mode');
        otherBtns.forEach(b => b.disabled = false);
    }

    const sq = modal.querySelector('.shape-btn[data-shape="square"]');
    const others = modal.querySelectorAll('.shape-btn:not([data-shape="square"])');
    if (isSquareModeActive) {
        sq.classList.add('active-flight-mode');
        others.forEach(b => b.disabled = true);
    } else {
        sq.classList.remove('active-flight-mode');
        others.forEach(b => b.disabled = false);
    }
}

function updateCalculatedValues(heightToCalculate) {
    let h = (typeof heightToCalculate === 'number')
        ? heightToCalculate
        : parseFloat(document.getElementById('height_above_sea').value) || 0;
    const temperature = T0 + L * h - 273.15;
    const pressure = P0 * Math.pow(1 + (L * h) / T0, -(g * M) / (R * L)) / 100;
    const tf = document.getElementById('calculated_temperature');
    const pf = document.getElementById('calculated_pressure');
    if (tf) tf.value = temperature.toFixed(1);
    if (pf) pf.value = pressure.toFixed(1);
}

function setupSettingsInputHandlers() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;

    const initialH = appSettings.heightAboveSea;
    const initialT = appSettings.targetAltitude;
    const hi = modal.querySelector('#height_above_sea');
    const ta = modal.querySelector('#target_altitude');
    const saveBtn = modal.querySelector('#saveSettingsBtn');
    const cancelBtn = modal.querySelector('#cancelSettingsBtn');
    const defBtn = modal.querySelector('.defaults-btn');
    const sqBtn = modal.querySelector('.shape-btn[data-shape="square"]');
    const circleBtn = modal.querySelector('.shape-btn[data-shape="circle"]');
    circleBtn.addEventListener('click', handleCircleModeToggle);

    hi.addEventListener('input', () => updateCalculatedValues());
    ta.addEventListener('input', () => {
    });

    saveBtn.addEventListener('click', () => {
        const newH = parseFloat(hi.value) || 0;
        const newT = parseFloat(ta.value) || INITIAL_TAKEOFF_ALTITUDE;
        appSettings.heightAboveSea = newH;
        heightAboveSeaLevel = newH;
        if (isFlying && newT !== appSettings.targetAltitude && isSquareModeActive) {
            isFlyingSquarePath = false;
            console.log("Square path paused due to target altitude change.");
        }
        appSettings.targetAltitude = newT;
        targetAltitude = newT;
        appSettings.lastUpdated = new Date();
        updateCalculatedValues(newH);
        closeSettingsModal();
    });

    cancelBtn.addEventListener('click', () => {
        appSettings.heightAboveSea = initialH;
        appSettings.targetAltitude = initialT;
        closeSettingsModal();
    });

    defBtn.addEventListener('click', () => {
        hi.value = 0;
        ta.value = INITIAL_TAKEOFF_ALTITUDE;
        updateCalculatedValues(0);
    });

    sqBtn.addEventListener('click', handleSquareModeToggle);
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

function handleSquareModeToggle() {
    const squareButton = document.querySelector('.shape-btn[data-shape="square"]');
    const otherShapeButtons = document.querySelectorAll('.shape-btn:not([data-shape="square"])');

    isSquareModeActive = !isSquareModeActive;
    if (isSquareModeActive) {
        if (squareButton) {
            squareButton.classList.add('active-flight-mode');
        }
        otherShapeButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('active-flight-mode');
        });

        // Reset square path state
        currentSquarePathIndex = 0;
        isFlyingSquarePath = false;
        droneReachedTargetAltitudeForSquarePath = false;

        if (isCircleModeActive) {
            isCircleModeActive = false;
            const circleBtn = document.querySelector('.shape-btn[data-shape="circle"]');
            if (circleBtn) circleBtn.classList.remove('active-flight-mode');
            isApproachingCircleStart = false;
            isFlyingCirclePath = false;
            droneReachedTargetAltitudeForCirclePath = false;
        }

        isPathPausedForLanding = false;
        landingSequenceActiveInMode = false;
        isReturningToPathAfterLandingCancel = false;
        dronePathBeforeLanding = null;

        console.log("Square mode activated. Waiting for flight start and target altitude.");
    } else {
        if (squareButton) {
            squareButton.classList.remove('active-flight-mode');

        }
        otherShapeButtons.forEach(btn => btn.disabled = false);
        isFlyingSquarePath = false;
        console.log("Square mode deactivated.");
    }
    updateSettingsFields();
}

function handleCircleModeToggle() {
    const circleBtn = document.querySelector('.shape-btn[data-shape="circle"]');
    const otherShapeButtons = document.querySelectorAll('.shape-btn:not([data-shape="circle"])');

    isCircleModeActive = !isCircleModeActive;
    if (isCircleModeActive) {
        if (circleBtn) circleBtn.classList.add('active-flight-mode');
        otherShapeButtons.forEach(b => {
            b.disabled = true;
            b.classList.remove('active-flight-mode');
        });

        isApproachingCircleStart = true;
        currentCircleApproachTarget = null;
        isFlyingCirclePath = false;
        currentCircleAngle = 0;
        droneReachedTargetAltitudeForCirclePath = false;

        if (isSquareModeActive) {
            isSquareModeActive = false;
            const squareBtn = document.querySelector('.shape-btn[data-shape="square"]');
            if (squareBtn) squareBtn.classList.remove('active-flight-mode');
            isFlyingSquarePath = false;
            droneReachedTargetAltitudeForSquarePath = false;
        }

        isPathPausedForLanding = false;
        landingSequenceActiveInMode = false;
        isReturningToPathAfterLandingCancel = false;
        dronePathBeforeLanding = null;

        console.log("Circle mode activated. Waiting for flight start and target altitude for approach.");
    } else {
        if (circleBtn) circleBtn.classList.remove('active-flight-mode');
        otherShapeButtons.forEach(b => b.disabled = false);
        isApproachingCircleStart = false;
        isFlyingCirclePath = false;
        console.log("Circle mode deactivated.");
    }
    updateSettingsFields();
}
