let currentDroneName = null;
let x = 0;
let y = 0;
let speedX = 0;
let speedY = 0;
let isFlying = false;
let path = [{x: 0, y: 0}];

// Константы для расчетов
const P0 = 101325.0;  // Давление на уровне моря (Па)
const T0 = 288.15;    // Температура на уровне моря (К)
const L = -0.0065;    // Температурный градиент (К/м)
const g = 9.80665;    // Ускорение свободного падения (м/с²)
const M = 0.0289644;  // Молярная масса воздуха (кг/моль)
const R = 8.3144598;  // Универсальная газовая постоянная (Дж/(моль·К))

let altitude = 0;
let time = 0;
let altitudeData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    line: { color: '#28a745', width: 2 }
};

// Глобальные переменные для данных графиков
let temperatureData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    line: { color: '#ff7f0e', width: 2 }
};

let pressureData = {
    x: [],
    y: [],
    type: 'scatter',
    mode: 'lines',
    line: { color: '#d62728', width: 2 }
};

let isMaxAltitudeReached = false;
let targetAltitude = 50;
let currentAmplitude = 0;

const GRAPH_WINDOW_SIZE = 300;
const UPDATE_INTERVAL = 16;

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
    isFlying = !isFlying;

    if (isFlying) {
        if (altitude === 0) {
            time = 0;
            altitude = 0;
            isMaxAltitudeReached = false;
            path = [{x: 0, y: 0}];
            plotlyPositionBatch = { x: [], y: [] };
            plotlyAltitudeBatch = { x: [], y: [] };
        }

        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
                <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
            </svg>`;
        startStopButton.style.backgroundColor = '#dc3545';

        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
        droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
    } else {
        startStopButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
                <path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"/>
            </svg>`;
        startStopButton.style.backgroundColor = '#28a745';

        cancelAnimationFrame(altitudeAnimationFrameId);
        cancelAnimationFrame(droneAnimationFrameId);
    }
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

// переключение темы
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    updateGraphTheme();
    updateMainGraphTheme();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.classList.toggle('dark-theme', savedTheme === 'dark');
}

initTheme();

function filterDrones() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const droneItems = document.querySelectorAll('.drone-list .drone-item');

    droneItems.forEach((item) => {
        const droneName = item.querySelector('.drone-name').textContent.toLowerCase();
        const droneModel = item.querySelector('.model').textContent.toLowerCase();

        if (droneName.includes(searchValue) || droneModel.includes(searchValue)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

async function loadDrones() {
    try {
        const response = await fetch('http://localhost:3000/drones');
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        const drones = await response.json();

        const droneList = document.querySelector('.drone-list');
        droneList.innerHTML = '';

        drones.forEach(drone => {
            const droneCard = createDroneCard(drone);
            droneList.appendChild(droneCard);
        });

        filterDrones();
    } catch (error) {
        console.error('Ошибка при загрузке дронов:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadDrones);

document.addEventListener('DOMContentLoaded', function () {
    let currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const graphConfigs = {
        'main-graph': {
            data: [{
                x: [0],
                y: [0],
                type: 'scatter',
                mode: 'markers',
                name: 'Местоположение',
                marker: {
                    color: '#007bff',
                    size: 10
                }
            }],
            layout: {
                title: 'График местоположения',
                xaxis: {
                    title: 'Ось X (м)',
                    range: [-10, 10],
                    showgrid: true,
                    zeroline: true,
                    zerolinecolor: currentTheme === 'dark' ? '#555' : '#ddd'
                },
                yaxis: {
                    title: 'Ось Y (м)',
                    range: [-10, 10],
                    showgrid: true,
                    zeroline: true,
                    zerolinecolor: currentTheme === 'dark' ? '#555' : '#ddd'
                },
                shapes: [
                    {
                        type: 'line',
                        x0: -10,
                        y0: 0,
                        x1: 10,
                        y1: 0,
                        line: {
                            color: currentTheme === 'dark' ? '#555' : '#ddd',
                            width: 2
                        }
                    },
                    {
                        type: 'line',
                        x0: 0,
                        y0: -10,
                        x1: 0,
                        y1: 10,
                        line: {
                            color: currentTheme === 'dark' ? '#555' : '#ddd',
                            width: 2
                        }
                    }
                ]
            }
        },
        'altitude-graph': {
            data: [],
            layout: {
                title: 'Высота полета',
                xaxis: {title: 'Время (сек)'},
                yaxis: {title: 'Метры'}
            }
        },
        'temperature-graph': {
            data: [],
            layout: {
                title: 'Температура',
                xaxis: {title: 'Время (сек)'},
                yaxis: {title: '°C'}
            }
        },
        'pressure-graph': {
            data: [],
            layout: {
                title: 'Атмосферное давление',
                xaxis: {title: 'Время (сек)'},
                yaxis: {title: 'гПа'}
            }
        }
    };

    function initGraphs(theme) {
        const textColor = theme === 'dark' ? '#fff' : '#000';
        const gridColor = theme === 'dark' ? '#555' : '#ddd';

        Object.keys(graphConfigs).forEach(graphId => {
            const config = graphConfigs[graphId];
            Plotly.react(graphId, config.data, {
                ...config.layout,
                plot_bgcolor: 'transparent',
                paper_bgcolor: 'transparent',
                font: {
                    color: textColor,
                    family: 'Arial, sans-serif'
                },
                xaxis: {
                    ...config.layout.xaxis,
                    showgrid: true,
                    gridcolor: gridColor,
                    linecolor: gridColor,
                    zerolinecolor: gridColor
                },
                yaxis: {
                    ...config.layout.yaxis,
                    showgrid: true,
                    gridcolor: gridColor,
                    linecolor: gridColor,
                    zerolinecolor: gridColor
                },
                margin: {t: 40, b: 60, l: 60, r: 30},
                autosize: true
            }, {
                responsive: true,
                displayModeBar: false
            });
        });

        setTimeout(() => {
            Object.keys(graphConfigs).forEach(graphId => {
                Plotly.Plots.resize(graphId);
            });
        }, 100);
    }

    const resizeHandler = () => {
        Object.keys(graphConfigs).forEach(graphId => {
            Plotly.Plots.resize(graphId).catch(() => {
            });
        });
    };

    initGraphs(currentTheme);
    window.addEventListener('resize', resizeHandler);

    window.toggleTheme = function () {
        document.body.classList.toggle('dark-theme');
        currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        initGraphs(currentTheme);
    };

    window.addEventListener('beforeunload', () => {
        window.removeEventListener('resize', resizeHandler);
    });
});

// Инициализация графика высоты
function initAltitudeGraph() {
    const isDark = document.body.classList.contains('dark-theme');
    const layout = {
        title: 'Высота полета',
        xaxis: {
            title: 'Время (сек)',
            range: [0, GRAPH_WINDOW_SIZE],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000',
            fixedrange: false
        },
        yaxis: {
            title: 'Метры',
            range: [0, 70],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000',
            fixedrange: false
        },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        font: {
            color: isDark ? '#fff' : '#000',
            family: 'Arial, sans-serif'
        },
        margin: { t: 40, b: 60, l: 60, r: 30 },
        dragmode: 'zoom'
    };

    Plotly.newPlot('altitude-graph', [altitudeData], layout, plotlyConfig);
}

function initTemperatureGraph() {
    const isDark = document.body.classList.contains('dark-theme');
    const layout = {
        title: 'Температура',
        xaxis: {
            title: 'Время (сек)',
            range: [0, GRAPH_WINDOW_SIZE],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000',
            fixedrange: false
        },
        yaxis: {
            title: '°C',
            range: [10, 30],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000'
        },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        font: {
            color: isDark ? '#fff' : '#000',
            family: 'Arial, sans-serif'
        },
        margin: { t: 40, b: 60, l: 60, r: 30 },
        dragmode: 'zoom'
    };

    Plotly.newPlot('temperature-graph', [temperatureData], layout, plotlyConfig);
}

function initPressureGraph() {
    const isDark = document.body.classList.contains('dark-theme');
    const layout = {
        title: 'Атмосферное давление',
        xaxis: {
            title: 'Время (сек)',
            range: [0, GRAPH_WINDOW_SIZE],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000',
            fixedrange: false
        },
        yaxis: {
            title: 'гПа',
            range: [900, 1100],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000'
        },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        font: {
            color: isDark ? '#fff' : '#000',
            family: 'Arial, sans-serif'
        },
        margin: { t: 40, b: 60, l: 60, r: 30 },
        dragmode: 'zoom'
    };

    Plotly.newPlot('pressure-graph', [pressureData], layout, plotlyConfig);
}

function updateGraphTheme() {
    const isDark = document.body.classList.contains('dark-theme');

    Plotly.relayout('altitude-graph', {
        'xaxis.gridcolor': isDark ? '#555' : '#ddd',
        'yaxis.gridcolor': isDark ? '#555' : '#ddd',
        'font.color': isDark ? '#fff' : '#000'
    });
}

function updateMainGraphTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    const gridColor = isDark ? '#555' : '#ddd';

    Plotly.relayout('main-graph', {
        'shapes[0].line.color': gridColor,
        'shapes[1].line.color': gridColor,
        'xaxis.gridcolor': gridColor,
        'yaxis.gridcolor': gridColor,
        'font.color': isDark ? '#fff' : '#000'
    });
}

const MAX_DATA_POINTS = 2000;
const POSITION_FPS = 30;
const ALTITUDE_FPS = 30;
const PLOTLY_BATCH_SIZE = 15;

let lastPositionUpdate = 0;
let lastAltitudeUpdate = 0;
let plotlyPositionBatch = { x: [], y: [] };
let plotlyAltitudeBatch = { x: [], y: [] };

function updateDronePosition(timestamp) {
    if (!isFlying) return;

    if (timestamp - lastPositionUpdate < 1000 / POSITION_FPS) {
        droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
        return;
    }
    lastPositionUpdate = timestamp;

    x += speedX * 0.1;
    y += speedY * 0.1;
    x = Math.max(-10, Math.min(10, x));
    y = Math.max(-10, Math.min(10, y));

    path.push({ x, y });

    if (path.length > MAX_DATA_POINTS) {
        path.shift();
    }

    Plotly.extendTraces('main-graph', {
        x: [[x]],
        y: [[y]]
    }, [0]);

    Plotly.relayout('main-graph', {
        'xaxis.range': [Math.min(x - 5, -10), Math.max(x + 5, 10)],
        'yaxis.range': [Math.min(y - 5, -10), Math.max(y + 5, 10)]
    });

    droneAnimationFrameId = requestAnimationFrame(updateDronePosition);
}


function smoothRandom() {
    targetAltitude = 50 + (Math.random() * 3 - 1.5);
    currentAmplitude = Math.max(-2, Math.min(2,
        currentAmplitude * 0.9 + (targetAltitude - 50) * 0.1
    ));
    return 50 + currentAmplitude;
}

// обновление высоты
function updateAltitude(timestamp) {
    if (!isFlying) return;

    if (timestamp - lastAltitudeUpdate < UPDATE_INTERVAL) {
        altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
        return;
    }
    lastAltitudeUpdate = timestamp;

    time += 0.1;

    if (!isMaxAltitudeReached) {
        altitude = Math.min(50, altitude + 0.5);
        if (altitude >= 50) isMaxAltitudeReached = true;
    } else {
        altitude = smoothRandom();
    }

    const temperature = (T0 + L * altitude) - 273.15 + (Math.random() - 0.5) * 0.02;
    const pressure = (P0 * Math.pow(1 - (L * altitude) / T0, (g * M) / (R * L)) / 100 + (Math.random() - 0.5) * 0.36);

    altitudeData.x.push(time);
    altitudeData.y.push(altitude);
    temperatureData.x.push(time);
    temperatureData.y.push(temperature);
    pressureData.x.push(time);
    pressureData.y.push(pressure);

    Plotly.extendTraces('altitude-graph', {
        x: [[time]],
        y: [[altitude]]
    }, [0]);

    Plotly.extendTraces('temperature-graph', {
        x: [[time]],
        y: [[temperature]]
    }, [0]);

    Plotly.extendTraces('pressure-graph', {
        x: [[time]],
        y: [[pressure]]
    }, [0]);

    const isUserInteracting = document.querySelector('.modebar-btn--hover');
    if (!isUserInteracting && time > GRAPH_WINDOW_SIZE) {
        const xRange = [time - GRAPH_WINDOW_SIZE, time];
        ['altitude-graph', 'temperature-graph', 'pressure-graph'].forEach(graphId => {
            Plotly.relayout(graphId, {
                'xaxis.range': xRange
            });
        });
    }

    altitudeAnimationFrameId = requestAnimationFrame(updateAltitude);
}

function initMainGraph() {
    const isDark = document.body.classList.contains('dark-theme');
    const layout = {
        title: 'График местоположения',
        xaxis: {
            title: 'Ось X (м)',
            range: [-10, 10],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000'
        },
        yaxis: {
            title: 'Ось Y (м)',
            range: [-10, 10],
            showgrid: true,
            gridcolor: isDark ? '#555' : '#ddd',
            zerolinecolor: isDark ? '#555' : '#ddd',
            color: isDark ? '#fff' : '#000'
        },
        plot_bgcolor: 'transparent',
        paper_bgcolor: 'transparent',
        font: {
            color: isDark ? '#fff' : '#000',
            family: 'Arial, sans-serif'
        },
        margin: { t: 40, b: 60, l: 60, r: 30 }
    };

    Plotly.newPlot('main-graph', [{
        x: [0],
        y: [0],
        type: 'scattergl',
        mode: 'lines+markers',
        line: {
            color: '#007bff',
            width: 2,
            simplify: true
        },
        marker: {
            color: '#007bff',
            size: 10
        }
    }], layout, plotlyConfig);
}

document.addEventListener('DOMContentLoaded', () => {
    initAltitudeGraph();
    initTemperatureGraph();
    initPressureGraph();
    initMainGraph();

    window.toggleTheme = function() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        updateGraphTheme();
    };
});

setInterval(updateAltitude, 1000);

// Функция для обновления графика
function updateAltitudeGraph(time, altitude) {
    altitudeData.x.push(time);
    altitudeData.y.push(altitude);

    if (altitudeData.x.length > 100) {
        altitudeData.x.shift();
        altitudeData.y.shift();
    }

    const yRange = [40, Math.max(40, altitude + 10)];

    Plotly.react('altitude-graph', [{
        x: altitudeData.x,
        y: altitudeData.y,
        type: 'scatter',
        mode: 'lines',
        name: 'Высота',
        line: {
            color: '#28a745',
            width: 2
        }
    }], {
        title: 'Высота полета',
        xaxis: { title: 'Время (сек)' },
        yaxis: { title: 'Метры', range: yRange }
    });
}

setInterval(() => {
    if (isFlying) {
        updateAltitude();
    }
}, 1000);

function startAltitudeUpdates() {
    updateAltitude();
}

document.addEventListener('DOMContentLoaded', initAltitudeGraph);

startAltitudeUpdates();

// движение дрона на графике
function moveForward() {
    if (isFlying) speedY = 1;
}

function moveBackward() {
    if (isFlying) speedY = -1;
}

function moveLeft() {
    if (isFlying) speedX = -1;
}

function moveRight() {
    if (isFlying) speedX = 1;
}


// управление клавишами
document.addEventListener('keydown', (event) => {
    if (isFlying) {
        switch (event.code) {
            case 'KeyW':
                speedY = 1;
                break;
            case 'KeyS':
                speedY = -1;
                break;
            case 'KeyA':
                speedX = -1;
                break;
            case 'KeyD':
                speedX = 1;
                break;
        }
    }

    if (event.code === 'KeyF') {
        toggleStartStop();
    }
});

document.addEventListener('keyup', (event) => {
    if (isFlying) {
        switch (event.code) {
            case 'KeyW':
            case 'KeyS':
                speedY = 0;
                break;
            case 'KeyA':
            case 'KeyD':
                speedX = 0;
                break;
        }
    }
});