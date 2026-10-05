// ─── Global State ───────────────────────────────────────────────────────────
let map, markers = [], heatmap, directionsService, directionsRenderer, userLocation;
let allFeeds = [];
let feedCount = 0;
const processedMarkers = new Set();

// Register globally BEFORE the Maps API loads (fixes race condition)
window.initMap = initMap;

// ─── Map Initialization ──────────────────────────────────────────────────────
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 21.1702, lng: 72.8311 }, // Default: Surat, Gujarat
        zoom: 3,
        styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
            { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
            { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
            { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
            { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
            { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
        ]
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        polylineOptions: { strokeColor: '#00e5ff', strokeWeight: 5 }
    });
    directionsRenderer.setMap(map);

    // Initialize heatmap layer with safe fallback for newer Maps API versions
    // where HeatmapLayer may have been deprecated/removed
    try {
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: [],
            map: null,
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(255, 165, 0, 1)',
                'rgba(255, 71, 87, 1)',
            ]
        });
    } catch (e) {
        console.warn("HeatmapLayer not available in this Maps API version. Using mock.");
        // Safe mock so the rest of the app never crashes
        const _data = [];
        heatmap = {
            setData: (d) => { _data.length = 0; },
            getData: () => _data,
            setMap: () => {}
        };
    }

    // Get user location for routing
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            },
            () => console.log("Geolocation denied")
        );
    }

    // Heatmap toggle
    const heatmapToggle = document.getElementById('heatmap-toggle');
    if (heatmapToggle) {
        heatmapToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                markers.forEach(m => m.setMap(null));
                heatmap.setMap(map);
            } else {
                heatmap.setMap(null);
                markers.forEach(m => m.setMap(map));
            }
        });
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Now safe to start fetching feeds
    fetchFeeds();
    setInterval(fetchFeeds, 5000);
}

// ─── Time Formatting ─────────────────────────────────────────────────────────
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return seconds + "s ago";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    return Math.floor(hours / 24) + "d ago";
}

// ─── UI Rendering ────────────────────────────────────────────────────────────
function reRenderUI() {
    // Guard: don't run until map and heatmap are initialized
    if (!map || !heatmap) return;

    // Clear existing markers from map
    markers.forEach(m => m.setMap(null));
    markers = [];

    // Reset heatmap data
    heatmap.setData([]);

    // Clear feed cards
    const feedContainer = document.getElementById('feed-container');
    if (feedContainer) feedContainer.innerHTML = '';
    feedCount = 0;
    const feedCountEl = document.getElementById('feed-count');
    if (feedCountEl) feedCountEl.textContent = '0';

    // Get filter values
    const categoryFilter = (document.getElementById('filter-category') || {}).value || 'all';
    const locationFilter = ((document.getElementById('filter-location') || {}).value || '').toLowerCase();

    allFeeds.forEach(feed => {
        const matchCat = categoryFilter === 'all' || feed.category === categoryFilter;
        const matchLoc = !locationFilter || (feed.location_name && feed.location_name.toLowerCase().includes(locationFilter));
        if (matchCat && matchLoc) {
            renderSingleFeedItem(feed);
        }
    });
}

function renderSingleFeedItem(item) {
    if (!map || !heatmap) return;

    const heatmapActive = (document.getElementById('heatmap-toggle') || {}).checked;

    // Add map marker
    const urgencyColor = item.urgency === 'high' ? '#ff4757' : item.urgency === 'medium' ? '#ffa502' : '#2ed573';
    const isNew = (Date.now() - item.timestamp) < 30000;

    // Build pulsing SVG for new reports
    const svgContent = isNew
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
            <circle cx="15" cy="15" r="8" fill="${urgencyColor}" stroke="white" stroke-width="2"/>
            <circle cx="15" cy="15" r="13" fill="none" stroke="${urgencyColor}" stroke-width="2" opacity="0.5">
              <animate attributeName="r" from="8" to="15" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite"/>
            </circle>
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <circle cx="10" cy="10" r="8" fill="${urgencyColor}" stroke="white" stroke-width="2"/>
           </svg>`;

    const marker = new google.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map: heatmapActive ? null : map,
        title: item.location_name,
        icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgContent)}`,
            anchor: new google.maps.Point(isNew ? 15 : 10, isNew ? 15 : 10)
        }
    });

    markers.push(marker);

    // Add to heatmap
    heatmap.getData().push({
        location: new google.maps.LatLng(item.lat, item.lng),
        weight: item.urgency === 'high' ? 3 : 1
    });

    // Info window on marker click
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="color:#333; padding:10px; min-width:200px;">
                <b style="text-transform:uppercase; color:${urgencyColor}; font-size:13px;">${item.category}</b>
                <p style="margin:8px 0; font-size:13px; line-height:1.4;">${item.text}</p>
                <small style="color:#666;">📍 ${item.location_name}</small><br>
                <button onclick="calculateRoute(${item.lat}, ${item.lng})"
                    style="margin-top:10px; background:#00e5ff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; width:100%;">
                    🧭 Get Directions
                </button>
            </div>
        `
    });

    marker.addListener("click", () => infoWindow.open(map, marker));

    // Feed card in sidebar
    const card = document.createElement('div');
    card.className = 'feed-card';
    if (isNew) card.style.borderColor = urgencyColor;
    card.innerHTML = `
        <div class="card-header">
            <span class="category ${item.category}">${item.category}</span>
            <span class="time">${timeAgo(new Date(item.timestamp))}</span>
        </div>
        <div class="message">${item.text}</div>
        <div class="location">📍 ${item.location_name}</div>
        <button class="route-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            Show Route to Location
        </button>
    `;

    card.querySelector('.route-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        calculateRoute(item.lat, item.lng);
    });

    card.addEventListener('click', () => {
        map.setCenter({ lat: item.lat, lng: item.lng });
        map.setZoom(13);
        infoWindow.open(map, marker);
    });

    const feedContainer = document.getElementById('feed-container');
    if (feedContainer) feedContainer.prepend(card);
    feedCount++;
    const feedCountEl = document.getElementById('feed-count');
    if (feedCountEl) feedCountEl.textContent = feedCount;
}

// ─── Routing ─────────────────────────────────────────────────────────────────
function calculateRoute(destLat, destLng) {
    if (!userLocation) {
        alert("Location access is needed to show routes. Please allow location permission.");
        return;
    }
    directionsService.route(
        {
            origin: userLocation,
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING
        },
        (result, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
                map.setZoom(12);
            } else {
                console.warn("Route error:", status);
                alert("Could not calculate route. Make sure Directions API is enabled in Google Cloud Console.");
            }
        }
    );
}

// ─── Feed Management ─────────────────────────────────────────────────────────
function addFeedItemToUI(item) {
    const uniqueId = `${item.timestamp}-${item.category}-${item.lat}`;
    if (processedMarkers.has(uniqueId)) return;
    processedMarkers.add(uniqueId);

    // Alert on new high-urgency items
    const ageSeconds = (Date.now() - item.timestamp) / 1000;
    if (item.urgency === 'high' && ageSeconds < 10) {
        const alertSound = document.getElementById('alert-sound');
        if (alertSound) alertSound.play().catch(() => {});
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`🚨 HIGH URGENCY: ${item.category.toUpperCase()}`, {
                body: `${item.location_name}: ${item.text}`
            });
        }
    }

    const categoryFilter = (document.getElementById('filter-category') || {}).value || 'all';
    const locationFilter = ((document.getElementById('filter-location') || {}).value || '').toLowerCase();
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchLoc = !locationFilter || (item.location_name && item.location_name.toLowerCase().includes(locationFilter));

    if (matchCat && matchLoc) {
        renderSingleFeedItem(item);
    }
}

async function fetchFeeds() {
    try {
        const response = await fetch('/api/feeds');
        const feeds = await response.json();
        allFeeds = feeds;
        feeds.sort((a, b) => a.timestamp - b.timestamp);
        reRenderUI();
    } catch (e) {
        console.error("Error fetching feeds:", e);
    }
}

// ─── Event Listeners (safe to run at top level, they don't need Google Maps) ─
document.addEventListener('DOMContentLoaded', () => {
    // Filter listeners
    const fCategory = document.getElementById('filter-category');
    const fLoc = document.getElementById('filter-location');
    if (fCategory) fCategory.addEventListener('change', reRenderUI);
    if (fLoc) fLoc.addEventListener('input', reRenderUI);

    // Manual SOS submission
    const submitBtn = document.getElementById('submit-sos-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const input = document.getElementById('manual-sos-input');
            const text = input.value.trim();
            if (!text) return;

            submitBtn.disabled = true;
            input.value = 'Submitting...';
            input.disabled = true;

            try {
                const response = await fetch('/api/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const data = await response.json();
                if (data.data) {
                    allFeeds.push(data.data);
                    addFeedItemToUI(data.data);
                    if (map) {
                        map.setCenter({ lat: data.data.lat, lng: data.data.lng });
                        map.setZoom(13);
                    }
                }
            } catch (e) {
                console.error("Submission failed:", e);
            } finally {
                input.value = '';
                input.disabled = false;
                submitBtn.disabled = false;
                input.focus();
            }
        });
    }

    // Voice input
    const voiceBtn = document.getElementById('voice-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (voiceBtn && SpeechRecognition) {
        let isRecording = false;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'hi-IN'; // Supports Hindi; falls back to English

        voiceBtn.addEventListener('click', () => {
            const input = document.getElementById('manual-sos-input');
            if (!isRecording) {
                recognition.start();
                isRecording = true;
                voiceBtn.classList.add('recording');
                input.placeholder = "Listening...";
            } else {
                recognition.stop();
                isRecording = false;
                voiceBtn.classList.remove('recording');
                input.placeholder = "Type or speak report...";
            }
        });

        recognition.onresult = (event) => {
            document.getElementById('manual-sos-input').value = event.results[0][0].transcript;
        };
        recognition.onend = () => {
            isRecording = false;
            voiceBtn.classList.remove('recording');
            document.getElementById('manual-sos-input').placeholder = "Type or speak report...";
        };
    }

    // Modal buttons
    const historyBtn = document.getElementById('nav-history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            const historyList = document.getElementById('history-list-container');
            if (!historyList) return;
            historyList.innerHTML = '';
            [...allFeeds].sort((a, b) => b.timestamp - a.timestamp).forEach(item => {
                const div = document.createElement('div');
                div.className = 'feed-card';
                div.innerHTML = `<b>${item.category.toUpperCase()}</b> — ${new Date(item.timestamp).toLocaleString()}<br><span style="font-size:13px;">${item.text}</span><br><small style="color:#00e5ff;">📍 ${item.location_name}</small>`;
                historyList.appendChild(div);
            });
            document.getElementById('history-modal').classList.remove('hidden');
        });
    }

    const contactsBtn = document.getElementById('nav-contacts-btn');
    if (contactsBtn) contactsBtn.addEventListener('click', () => document.getElementById('contacts-modal').classList.remove('hidden'));

    const helplinesBtn = document.getElementById('nav-helplines-btn');
    if (helplinesBtn) helplinesBtn.addEventListener('click', () => document.getElementById('helplines-modal').classList.remove('hidden'));

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            if (target) document.getElementById(target).classList.add('hidden');
        });
    });
});
