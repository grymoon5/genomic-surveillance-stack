const config = window.APP_CONFIG || {};
const API_BASE = config.API_BASE || 'http://localhost:3000';
const WS_URL = config.WS_URL || 'ws://localhost:3000';
const RASTER_TILE_URL = config.RASTER_TILE_URL || 'http://localhost:8000/tiles/{z}/{x}/{y}.png';

const singaporeCenter = [103.8198, 1.3521];
const caseGeoJSON = {
    type: 'FeatureCollection',
    features: []
};

const logsDiv = document.getElementById('logs');
const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const summaryEl = document.getElementById('summary');
const simulateButton = document.getElementById('simulate-case');
const caseTypeSelect = document.getElementById('case-type');

let websocket;
let reconnectTimer;

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: singaporeCenter,
    zoom: 11
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');

function setStatus(state, text) {
    statusEl.className = state;
    statusText.innerText = text;
}

function updateSummary() {
    const total = caseGeoJSON.features.length;
    summaryEl.innerText = `${total} case${total === 1 ? '' : 's'} loaded`;
}

function formatLocation(lat, lng) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function addLogEntry(data, prepend = true) {
    const logEntry = document.createElement('p');
    const label = String(data.case_type || 'unknown');
    const id = String(data.id || 'no-id');
    logEntry.innerText = `[${label}] ID: ${id.substring(0, 12)} @ ${formatLocation(data.lat, data.lng)}`;

    if (prepend) {
        logsDiv.insertBefore(logEntry, logsDiv.firstChild);
    } else {
        logsDiv.appendChild(logEntry);
    }

    while (logsDiv.children.length > 80) {
        logsDiv.removeChild(logsDiv.lastChild);
    }
}

function createGeoJSONFeature(data) {
    return {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [Number(data.lng), Number(data.lat)]
        },
        properties: {
            id: String(data.id),
            case_type: String(data.case_type),
            timestamp: data.timestamp || new Date().toISOString(),
            weight: 1
        }
    };
}

function updateCaseSource(data, prepend = true) {
    const feature = createGeoJSONFeature(data);
    if (prepend) {
        caseGeoJSON.features.unshift(feature);
    } else {
        caseGeoJSON.features.push(feature);
    }

    if (caseGeoJSON.features.length > 300) {
        caseGeoJSON.features.pop();
    }

    const source = map.getSource('cases');
    if (source) {
        source.setData(caseGeoJSON);
    }
    updateSummary();
}

function randomSingaporePoint() {
    const lng = singaporeCenter[0] + (Math.random() - 0.5) * 0.16;
    const lat = singaporeCenter[1] + (Math.random() - 0.5) * 0.11;
    return { lng: Number(lng.toFixed(5)), lat: Number(lat.toFixed(5)) };
}

async function loadExistingCases() {
    try {
        const response = await fetch(`${API_BASE}/api/logs`);
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        const logs = await response.json();
        logs.forEach((log) => {
            updateCaseSource(log, false);
            addLogEntry(log, false);
        });
    } catch (error) {
        console.warn('Could not load existing cases:', error);
        setStatus('offline', 'Backend unavailable');
    }
}

async function submitSimulatedCase() {
    simulateButton.disabled = true;
    const point = randomSingaporePoint();
    const payload = {
        id: `case-${Date.now()}`,
        case_type: caseTypeSelect.value,
        lng: point.lng,
        lat: point.lat
    };

    try {
        const response = await fetch(`${API_BASE}/api/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    } catch (error) {
        console.error('Could not submit simulated case:', error);
        setStatus('offline', 'Could not submit case');
    } finally {
        simulateButton.disabled = false;
    }
}

function connectWebSocket() {
    clearTimeout(reconnectTimer);
    setStatus('offline', 'Connecting to backend...');

    websocket = new WebSocket(WS_URL);
    websocket.onopen = () => setStatus('connected', 'Live backend connected');
    websocket.onclose = () => {
        setStatus('offline', 'Backend disconnected');
        reconnectTimer = setTimeout(connectWebSocket, 2500);
    };
    websocket.onerror = () => {
        setStatus('offline', 'Backend connection error');
    };
    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === 'NEW_CASE') {
            addLogEntry(data);
            updateCaseSource(data);
        }
    };
}

map.on('load', () => {
    map.addSource('mock-raster', {
        type: 'raster',
        tiles: [RASTER_TILE_URL],
        tileSize: 256
    });

    map.addLayer({
        id: 'mock-raster-layer',
        type: 'raster',
        source: 'mock-raster',
        paint: {
            'raster-opacity': 0.28
        }
    });

    map.addSource('cases', {
        type: 'geojson',
        data: caseGeoJSON
    });

    map.addLayer({
        id: 'cases-heat',
        type: 'heatmap',
        source: 'cases',
        maxzoom: 15,
        paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(0, 255, 0, 0)',
                0.25, 'rgb(118, 220, 91)',
                0.5, 'rgb(255, 223, 80)',
                0.75, 'rgb(255, 170, 0)',
                1, 'rgb(204, 0, 0)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 30],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 14, 0.3]
        }
    });

    map.addLayer({
        id: 'cases-point',
        type: 'circle',
        source: 'cases',
        minzoom: 10,
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 14, 8],
            'circle-color': '#ff4500',
            'circle-stroke-color': 'white',
            'circle-stroke-width': 1,
            'circle-opacity': 0.9
        }
    });

    map.on('click', 'cases-point', (event) => {
        const feature = event.features && event.features[0];
        if (!feature) return;
        const properties = feature.properties || {};
        const coordinates = feature.geometry.coordinates.slice();
        new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<strong>${properties.case_type}</strong><br>ID: ${properties.id}<br>Location: ${formatLocation(coordinates[1], coordinates[0])}`)
            .addTo(map);
    });

    map.on('mouseenter', 'cases-point', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'cases-point', () => {
        map.getCanvas().style.cursor = '';
    });

    loadExistingCases();
});

simulateButton.addEventListener('click', submitSimulatedCase);
connectWebSocket();
updateSummary();
