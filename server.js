const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Initialize express app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// CORS configuration
app.use(cors());
app.use(express.static('public'));  // Serve static files from 'public' folder

// Responders data (for testing purposes)
let responders = [
    { name: 'Responder 1', lat: 13.0674, lon: 80.2377, available: true }, // Near Chennai
    { name: 'Responder 2', lat: 12.9716, lon: 77.5946, available: true }, // Bangalore
    { name: 'Responder 3', lat: 13.0827, lon: 80.2707, available: true }, // Chennai
    { name: 'Responder 4', lat: 11.0168, lon: 76.9558, available: false } // Coimbatore
];

// Socket.io connection and communication with clients
io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Emit available responders to the client
    socket.emit('available-responders', responders);

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Set up the server to listen on port 3000
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
