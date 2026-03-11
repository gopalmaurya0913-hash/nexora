const processedMarkers = new Set();

    // Detect User Location for Routing
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("User location detected:", userLocation);
            },
            () => console.log("Geolocation permission denied")
        );
    }

    const heatmapToggle = document.getElementById('heatmap-toggle');
    heatmapToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            markers.forEach(m => m.setMap(null));
            heatmap.setMap(map);
        } else {
            heatmap.setMap(null);
            markers.forEach(m => m.setMap(map));
        }
    });

    fetchFeeds();
}

// Global scope for callback
window.initMap = initMap;

// Replacement for Leaflet timeAgo
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}

// Function to redraw everything when filters change
function reRenderUI() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    heatmap.setData(new google.maps.MVCArray([]));
    feedContainer.innerHTML = '';
    feedCount = 0;
    
    const categoryFilter = document.getElementById('filter-category') ? document.getElementById('filter-category').value : 'all';
    const locationFilterInput = document.getElementById('filter-location');
    const locationFilter = locationFilterInput ? locationFilterInput.value.toLowerCase() : '';

    allFeeds.forEach(feed => {
        const matchCat = categoryFilter === 'all' || feed.category === categoryFilter;
        const matchLoc = !locationFilter || (feed.location_name && feed.location_name.toLowerCase().includes(locationFilter));
        
        if (matchCat && matchLoc) {
            renderSingleFeedItem(feed);
        }
    });
}

function calculateRoute(destLat, destLng) {
    if (!userLocation) {
        alert("Please enable location permissions to see routes.");
        return;
    }

    const request = {
        origin: userLocation,
        destination: { lat: destLat, lng: destLng },
        travelMode: 'DRIVING'
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
        } else {
            alert("Could not calculate route: " + status);
        }
    });
}

function renderSingleFeedItem(item) {
    const isNew = (new Date() - new Date(item.timestamp)) < 30000;
    
    // Create Custom Marker HTML for pulsing effect
    const markerOverlay = document.createElement("div");
    markerOverlay.className = `custom-marker marker-${item.urgency} ${isNew ? 'pulsing-ring' : ''}`;
    
    const marker = new google.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map: document.getElementById('heatmap-toggle').checked ? null : map,
        title: item.category,
        icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="${item.urgency === 'high' ? '#ff4757' : item.urgency === 'medium' ? '#ffa502' : '#2ed573'}" stroke="white" stroke-width="2"/></svg>`
            )}`,
            anchor: new google.maps.Point(10, 10)
        }
    });

    markers.push(marker);

    // Update Heatmap data
    const heatData = heatmap.getData();
    heatData.push({
        location: new google.maps.LatLng(item.lat, item.lng),
        weight: item.urgency === 'high' ? 3 : 1
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="color: #333; padding: 10px;">
                <b style="text-transform:uppercase; color:#ff4757;">${item.category}</b>
                <p style="margin:5px 0;">${item.text}</p>
                <small>📍 ${item.location_name}</small><br>
                <button onclick="calculateRoute(${item.lat}, ${item.lng})" style="margin-top:10px; background:#00e5ff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">Get Directions</button>
            </div>
        `
    });

    marker.addListener("click", () => {
        infoWindow.open(map, marker);
    });

    // 2. Add feed card to sidebar
    const card = document.createElement('div');
    card.className = 'feed-card';
    card.innerHTML = `
        <div class="card-header">
            <span class="category ${item.category}">${item.category}</span>
            <span class="time">${timeAgo(new Date(item.timestamp))}</span>
        </div>
        <div class="message">${item.text}</div>
        <div class="location">
             📍 ${item.location_name}
        </div>
        <button class="route-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            Show Route to Location
        </button>
    `;
    
    card.querySelector('.route-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        calculateRoute(item.lat, item.lng);
    });

    card.addEventListener('click', () => {
        map.setCenter({ lat: item.lat, lng: item.lng });
        map.setZoom(15);
        infoWindow.open(map, marker);
    });

    feedContainer.prepend(card);
    feedCount++;
    document.getElementById('feed-count').textContent = feedCount;
}

function addFeedItemToUI(item) {
    const uniqueId = `${item.timestamp}-${item.category}`;
    if (!processedMarkers.has(uniqueId)) {
        processedMarkers.add(uniqueId);
        const ageSeconds = (new Date() - new Date(item.timestamp)) / 1000;
        if (item.urgency === 'high' && ageSeconds < 10) {
            document.getElementById('alert-sound').play().catch(e => console.log("Audio autoplay prevented"));
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`🚨 HIGH URGENCY: ${item.category.toUpperCase()}`, {
                    body: `${item.location_name}: ${item.text}`,
                    icon: "/static/alert_icon.png"
                });
            }
        }
    }
    
    const categoryFilter = document.getElementById('filter-category') ? document.getElementById('filter-category').value : 'all';
    const locationFilterInput = document.getElementById('filter-location');
    const locationFilter = locationFilterInput ? locationFilterInput.value.toLowerCase() : '';
    
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
        feeds.sort((a,b) => a.timestamp - b.timestamp);
        reRenderUI();
    } catch (e) {
        console.error("Error fetching feeds:", e);
    }
}

const feedContainer = document.getElementById('feed-container');

// Event Listeners for Filters
const fCategory = document.getElementById('filter-category');
const fLoc = document.getElementById('filter-location');
if (fCategory) fCategory.addEventListener('change', reRenderUI);
if (fLoc) fLoc.addEventListener('input', reRenderUI);

setInterval(fetchFeeds, 5000);

// Handle manual submission
document.getElementById('submit-sos-btn').addEventListener('click', async () => {
    const input = document.getElementById('manual-sos-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = 'Submitting...';
    input.disabled = true;
    
    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if(data.data) {
            addFeedItemToUI(data.data);
            map.setCenter({ lat: data.data.lat, lng: data.data.lng });
            map.setZoom(15);
        }
    } catch (e) {
        console.error("Submission failed:", e);
    } finally {
        input.value = '';
        input.disabled = false;
        input.focus();
    }
});

// Speech to Text logic
const voiceBtn = document.getElementById('voice-btn');
let isRecording = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

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

// Modal Logic (History, Contacts, etc.)
document.getElementById('nav-history-btn').addEventListener('click', () => {
    const historyList = document.getElementById('history-list-container');
    historyList.innerHTML = '';
    const sorted = [...allFeeds].sort((a,b) => b.timestamp - a.timestamp);
    sorted.forEach(item => {
        const div = document.createElement('div');
        div.className = 'feed-card';
        div.innerHTML = `<b>${item.category}</b> - ${new Date(item.timestamp).toLocaleString()}<br>${item.text}<br>📍 ${item.location_name}`;
        historyList.appendChild(div);
    });
    document.getElementById('history-modal').classList.remove('hidden');
});

document.getElementById('nav-contacts-btn').addEventListener('click', () => document.getElementById('contacts-modal').classList.remove('hidden'));
document.getElementById('nav-helplines-btn').addEventListener('click', () => document.getElementById('helplines-modal').classList.remove('hidden'));

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.getElementById(e.target.getAttribute('data-target')).classList.add('hidden');
    });
});

window.initMap = initMap;
document.addEventListener('DOMContentLoaded', () => {
    // If not loaded yet by script callback
    if (typeof google === 'undefined') {
         console.log("Waiting for Google Maps to load...");
    }
});
