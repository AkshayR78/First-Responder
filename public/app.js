const socket = io();

// Initialize map centered in Chennai
const map = L.map('map').setView([13.0827, 80.2707], 13);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Custom icons
const userIcon = L.icon({
    iconUrl: 'images/user.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const responderIcon = L.icon({
    iconUrl: 'images/responder.png',
    iconSize: [30, 45],
    iconAnchor: [15, 45]
});

const ambulanceIcon = L.icon({
    iconUrl: 'images/ambulance.png',
    iconSize: [35, 50],
    iconAnchor: [17, 50]
});

// User location & route variables
let userMarker, routeLayer;
let responders = [];

// Get user's live location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        console.log("User location:", userLat, userLon);

        // Add user marker
        userMarker = L.marker([userLat, userLon], { icon: userIcon }).addTo(map)
            .bindPopup('You are here').openPopup();

        map.setView([userLat, userLon], 13);

        // Fetch responders and process route
        socket.emit('get-responders');

        socket.on('available-responders', (data) => {
            console.log("Responders received:", data);
            responders = data;
            showResponders(userLat, userLon);
            findNearestResponder(userLat, userLon);
        });

    }, err => {
        console.log("Error getting geolocation:", err);
    });
} else {
    alert("Geolocation not supported in this browser.");
}

// Show responders on the map
function showResponders(userLat, userLon) {
    responders.forEach(responder => {
        console.log("Adding responder marker:", responder.name, responder.lat, responder.lon);
        const isAmbulance = responder.type === 'ambulance'; // Check responder type

        const marker = L.marker([responder.lat, responder.lon], { 
            icon: isAmbulance ? ambulanceIcon : responderIcon 
        }).addTo(map);

        // Calculate distance
        const distance = calculateDistance(userLat, userLon, responder.lat, responder.lon).toFixed(2);
        
        // Get estimated time
        getTravelTime(userLat, userLon, responder.lat, responder.lon, (durationText) => {
            marker.bindPopup(`${responder.name}<br>Distance: ${distance} km<br>ETA: ${durationText}`);
        });
    });
}

// Calculate Haversine distance (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find the nearest available responder
function findNearestResponder(userLat, userLon) {
    let nearestResponder = null;
    let minDistance = Infinity;

    responders.forEach(responder => {
        const distance = calculateDistance(userLat, userLon, responder.lat, responder.lon);
        console.log(`Distance to ${responder.name}: ${distance.toFixed(2)} km`);

        if (distance <= 700) { // 700km limit
            if (distance < minDistance) {
                minDistance = distance;
                nearestResponder = responder;
            }
        }
    });

    if (nearestResponder) {
        console.log("Nearest responder:", nearestResponder.name, nearestResponder.lat, nearestResponder.lon);
        drawRoute(userLat, userLon, nearestResponder.lat, nearestResponder.lon);
    } else {
        console.log("No responders available within the radius.");
    }
}

// Draw route from user to responder using OSRM
function drawRoute(startLat, startLon, endLat, endLon) {
    console.log(`Fetching route from (${startLat}, ${startLon}) to (${endLat}, ${endLon})`);

    const routeURL = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

    fetch(routeURL)
        .then(response => response.json())
        .then(data => {
            console.log("Route data received:", data);

            if (data.routes && data.routes.length > 0) {
                const routeCoordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                if (routeLayer) {
                    map.removeLayer(routeLayer);
                }

                routeLayer = L.polyline(routeCoordinates, { color: 'blue', weight: 5 }).addTo(map);
            } else {
                console.log("No route found between user and responder.");
            }
        })
        .catch(error => console.log("Error fetching route:", error));
}

// Get estimated travel time using OSRM API
function getTravelTime(startLat, startLon, endLat, endLon, callback) {
    const osrmURL = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false`;

    fetch(osrmURL)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const duration = data.routes[0].duration; // Time in seconds
                const minutes = Math.round(duration / 60); // Convert to minutes
                callback(`${minutes} min`);
            } else {
                callback("N/A");
            }
        })
        .catch(error => {
            console.log("Error fetching travel time:", error);
            callback("N/A");
        });
}
