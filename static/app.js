// Initialize Leaflet Map
// Center globally
const map = L.map('map').setView([20, 0], 2);

// Using a dark theme map tile layer (CartoDB Dark Matter)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// Keep track of markers to avoid duplicates
const processedMarkers = new Set();
// Store actual marker objects if we want to cluster or manipulate them later
const markerLayers = L.layerGroup().addTo(map);

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const feedCountBtn = document.getElementById('feed-count');
const manualInput = document.getElementById('manual-sos-input');
const submitBtn = document.getElementById('submit-sos-btn');

let feedCount = 0;

function createCustomIcon(urgency) {
    let className = 'marker-low';
    if(urgency === 'high') className = 'marker-high';
    if(urgency === 'medium') className = 'marker-medium';

    return L.divIcon({
        className: `custom-marker ${className}`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
}

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

function addFeedItemToUI(item) {
    // Prevent adding duplicates based on exact text and timestamp
    const uniqueId = `${item.timestamp}-${item.category}`;
    if (processedMarkers.has(uniqueId)) return;
    processedMarkers.add(uniqueId);
    
    // 1. Add Marker to Map
    const marker = L.marker([item.lat, item.lng], {
        icon: createCustomIcon(item.urgency)
    });
    
    const popupContent = `
        <div style="font-family:'Inter'; text-transform:uppercase; font-size:10px; font-weight:bold; color:var(--accent-primary); margin-bottom:5px;">
            ${item.category}
        </div>
        <p style="margin:0; font-size:13px; line-height:1.4;">${item.text}</p>
        <div style="font-size:11px; color:#888; margin-top:5px;">📍 ${item.location_name}</div>
    `;
    marker.bindPopup(popupContent);
    markerLayers.addLayer(marker);

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
    `;
    
    // Clicking the card centers the map on the marker
    card.addEventListener('click', () => {
        map.setView([item.lat, item.lng], 16, { animate: true });
        marker.openPopup();
    });

    // Add to top of list
    feedContainer.prepend(card);
    
    // Update count
    feedCount++;
    feedCountBtn.textContent = feedCount;
}

// Fetch periodic mock feeds from backend
async function fetchFeeds() {
    try {
        const response = await fetch('/api/feeds');
        const feeds = await response.json();
        
        allFeeds = feeds; // Store for history view
        
        // Let's assume the API returns the entire history, but we only want differences
        // We'll iterate the list and try to add them. addFeedItemToUI handles duplicates.
        // We iterate backwards to add older first, then newer on top if we are re-rendering locally,
        // but since we prepend, we want to iterate forward to place newest at top eventually;
        // actually let's sort by timestamp ascending so the prepend logic stacked them newest-first.
        feeds.sort((a,b) => a.timestamp - b.timestamp);
        
        feeds.forEach(feed => {
            addFeedItemToUI(feed);
        });
    } catch (e) {
        console.error("Error fetching feeds:", e);
    }
}

// Poll every 5 seconds
setInterval(fetchFeeds, 5000);
// Initial fetch
fetchFeeds();

// Handle manual submission
submitBtn.addEventListener('click', async () => {
    const text = manualInput.value.trim();
    if (!text) return;
    
    manualInput.value = 'Submitting...';
    manualInput.disabled = true;
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if(data.data) {
            addFeedItemToUI(data.data);
            map.setView([data.data.lat, data.data.lng], 15, { animate: true });
        }
    } catch (e) {
        console.error("Submission failed:", e);
    } finally {
        manualInput.value = '';
        manualInput.disabled = false;
        submitBtn.disabled = false;
        manualInput.focus();
    }
});

// Modal Logic
const historyBtn = document.getElementById('nav-history-btn');
const contactsBtn = document.getElementById('nav-contacts-btn');
const helplinesBtn = document.getElementById('nav-helplines-btn');
const historyModal = document.getElementById('history-modal');
const contactsModal = document.getElementById('contacts-modal');
const helplinesModal = document.getElementById('helplines-modal');
const closeBtns = document.querySelectorAll('.close-modal-btn');
const historyList = document.getElementById('history-list-container');

// All fetched feeds
let allFeeds = [];

function populateHistory() {
    historyList.innerHTML = '';
    if(allFeeds.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No records found.</p>';
        return;
    }
    
    // Reverse sort to show newest first
    const sorted = [...allFeeds].sort((a,b) => b.timestamp - a.timestamp);
    
    sorted.forEach(item => {
        const div = document.createElement('div');
        div.className = 'feed-card'; // Reuse existing CSS
        div.style.animation = 'none'; // no slide in for bulk
        div.innerHTML = `
            <div class="card-header">
                <span class="category ${item.category}">${item.category}</span>
                <span class="time">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <div class="message">${item.text}</div>
            <div class="location">
                 📍 ${item.location_name} [${item.lat.toFixed(2)}, ${item.lng.toFixed(2)}]
            </div>
        `;
        historyList.appendChild(div);
    });
}

// Open modals
historyBtn.addEventListener('click', () => {
    populateHistory();
    historyModal.classList.remove('hidden');
});
contactsBtn.addEventListener('click', () => {
    contactsModal.classList.remove('hidden');
});
helplinesBtn.addEventListener('click', () => {
    helplinesModal.classList.remove('hidden');
});

// Close modals
closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-target');
        document.getElementById(targetId).classList.add('hidden');
    });
});

// Close when clicking outside
window.addEventListener('click', (e) => {
    if(e.target.classList.contains('modal-backdrop')) {
        e.target.classList.add('hidden');
    }
});

// Update times periodically in cards
setInterval(() => {
    // This is a simple hack. In a React app we'd rerender. Here we'll just leave it or could query selectors and update innerText.
}, 60000);
