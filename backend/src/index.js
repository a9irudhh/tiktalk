import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv'

dotenv.config({
    path: './.env'
})

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 8000;

// Allow multiple origins for development and production
const allowedOrigins = [
    'http://localhost:3000',
    FRONTEND_URL,
    FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL + '/'
].filter((origin, index, self) => origin && self.indexOf(origin) === index);

// console.log('Allowed CORS origins:', allowedOrigins);

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                console.log('CORS blocked origin:', origin);
                return callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    }
});

// Enable CORS and JSON parsing
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.log('Express CORS blocked origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.static('public'));

let allSockets = [];

// Helper function to clean up empty rooms and optimize data structure
const cleanupEmptyRooms = () => {
    console.log('Starting room cleanup...');
    
    // Remove stale socket connections that might be disconnected
    const validSockets = allSockets.filter(user => {
        if (user.socket && user.socket.connected) {
            return true;
        } else {
            console.log(`Removing stale connection for user: ${user.name} in room: ${user.room}`);
            return false;
        }
    });
    
    // Update allSockets with only valid connections
    const removedCount = allSockets.length - validSockets.length;
    allSockets = validSockets;
    
    if (removedCount > 0) {
        console.log(`Removed ${removedCount} stale connections`);
    }
    
    const activeRooms = new Set();
    
    // Collect all active rooms
    allSockets.forEach(user => {
        if (user.room) {
            activeRooms.add(user.room);
        }
    });
    
    // Get all Socket.IO rooms (excluding default socket rooms)
    const allSocketRooms = new Set();
    io.sockets.adapter.rooms.forEach((sockets, roomName) => {
        // Skip rooms that are just socket IDs (default rooms)
        if (!sockets.has(roomName)) {
            allSocketRooms.add(roomName);
        }
    });
    
    // Find empty rooms to clean up
    const emptyRooms = [];
    allSocketRooms.forEach(roomName => {
        if (!activeRooms.has(roomName)) {
            emptyRooms.push(roomName);
        }
    });
    
    // Clean up empty Socket.IO rooms
    emptyRooms.forEach(roomName => {
        io.sockets.adapter.del(roomName);
        console.log(`Cleaned up empty room: ${roomName}`);
    });
    
    // Log cleanup info
    const roomCounts = {};
    allSockets.forEach(user => {
        if (user.room) {
            roomCounts[user.room] = (roomCounts[user.room] || 0) + 1;
        }
    });
    
    console.log('Active rooms:', Object.keys(roomCounts).length);
    console.log('Room participants:', roomCounts);
    console.log('Total connections:', allSockets.length);
    
    if (emptyRooms.length > 0) {
        console.log('Removed empty rooms:', emptyRooms);
    }
}

// Periodic cleanup now runs less frequently since we clean up immediately on exit/disconnect
setInterval(() => {
    console.log('Running periodic room cleanup (for any edge cases)...');
    cleanupEmptyRooms();
}, 60 * 60 * 1000); // Every hour

// Socket.IO connection handling
io.on('connection', (socket) => {
    // console.log('A user connected:', socket.id);

    socket.on('join', (data) => {
        try {
            const { room, name } = data;
            const trimmedName = name.trim();
            
            const existingUser = allSockets.find(user => 
                user.room === room && user.name.toLowerCase() === trimmedName.toLowerCase()
            );
            
            if (existingUser) {
                socket.emit('error', { message: 'You are already in the room with this name' });
                // console.log(`${trimmedName} attempted to join room ${room} but name already exists`);
                return;
            }
            
            socket.join(room);
            allSockets.push({
                socketId: socket.id,
                socket: socket,
                room: room,
                name: trimmedName
            });

            console.log(`${trimmedName} joined room ${room}`);
            const roomParticipants = allSockets
                .filter(user => user.room === room)
                .map(user => user.name);

            console.log(`Room ${room} now has ${roomParticipants.length} participants: ${roomParticipants.join(', ')}`);
            io.to(room).emit('participants', roomParticipants);
            socket.emit('joinConfirmed', { room, name: trimmedName });

        } catch (error) {
            console.log('Error in join event:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    socket.on('chat', (data) => {
        try {
            const { message, name } = data;
            const userInfo = allSockets.find(user => user.socketId === socket.id);
            
            if (!userInfo) {
                socket.emit('error', { message: 'User not found in any room' });
                return;
            }

            const { room } = userInfo;

            io.to(room).emit('chat', {
                message: message,
                name: name,
                timestamp: new Date().toISOString()
            });

            // console.log(`Message from ${name} in room ${room}: ${message}`);
        } catch (error) {
            console.log('Error in chat event:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('exit', (data) => {
        try {
            const { room, name } = data;
            
            // Remove user from allSockets
            allSockets = allSockets.filter(user => 
                !(user.room === room && user.name === name)
            );

            // Leave the room
            socket.leave(room);
            
            // Check remaining participants in this room
            const roomParticipants = allSockets
                .filter(user => user.room === room)
                .map(user => user.name);

            // If room is now empty, clean it up immediately
            if (roomParticipants.length === 0) {
                console.log(`Room ${room} is now empty, cleaning up...`);
                // Remove the room from Socket.IO adapter
                io.sockets.adapter.del(room);
                console.log(`Deleted empty room: ${room}`);
            } else {
                // Notify remaining participants about updated participant list
                io.to(room).emit('participants', roomParticipants);
                console.log(`Room ${room} now has ${roomParticipants.length} participants: ${roomParticipants.join(', ')}`);
            }

            console.log(`${name} left room ${room}`);

        } catch (error) {
            console.log('Error in exit event:', error);
        }
    });

    socket.on('getAllNames', () => {
        try {
            const allNames = allSockets.map(user => user.name);
            socket.emit('allNames', allNames);
        } catch (error) {
            console.log('Error in getAllNames event:', error);
            socket.emit('error', { message: 'Failed to get all names' });
        }
    });

    socket.on('typing', (data) => {
        try {
            const { room, name, typing } = data;
            const userInfo = allSockets.find(user => user.socketId === socket.id);
            
            if (!userInfo) {
                return;
            }

            // Broadcast typing status to all users in the room except sender
            socket.to(room).emit('typing', { name, typing });
            
        } catch (error) {
            console.log('Error in typing event:', error);
        }
    });

    socket.on('disconnect', () => {
        try {
            // console.log('User disconnected:', socket.id);
            
            // Find the user that disconnected
            const disconnectedUser = allSockets.find(user => user.socketId === socket.id);
            
            if (disconnectedUser) {
                const { room, name } = disconnectedUser;
                
                // Remove user from allSockets
                allSockets = allSockets.filter(user => user.socketId !== socket.id);

                // Check remaining participants in this room
                const roomParticipants = allSockets
                    .filter(user => user.room === room)
                    .map(user => user.name);

                // If room is now empty, clean it up immediately
                if (roomParticipants.length === 0) {
                    console.log(`Room ${room} is now empty after disconnect, cleaning up...`);
                    // Remove the room from Socket.IO adapter
                    io.sockets.adapter.del(room);
                    console.log(`Deleted empty room: ${room}`);
                } else {
                    // Notify remaining participants about updated participant list
                    io.to(room).emit('participants', roomParticipants);
                    console.log(`Room ${room} now has ${roomParticipants.length} participants after disconnect: ${roomParticipants.join(', ')}`);
                }

                console.log(`${name} disconnected from room ${room}`);
            }
        } catch (error) {
            console.log('Error in disconnect event:', error);
        }
    });
});

// Helper function to get room statistics
const getRoomStats = () => {
    const roomCounts = {};
    const totalUsers = allSockets.length;
    
    allSockets.forEach(user => {
        if (user.room) {
            roomCounts[user.room] = (roomCounts[user.room] || 0) + 1;
        }
    });
    
    const totalRooms = Object.keys(roomCounts).length;
    const averageUsersPerRoom = totalRooms > 0 ? (totalUsers / totalRooms).toFixed(2) : 0;
    
    return {
        totalUsers,
        totalRooms,
        averageUsersPerRoom,
        roomCounts,
        timestamp: new Date().toISOString()
    };
}

// health check
app.get('/', (req, res) => {
    res.json({ message: 'TikTalk Socket.IO Chat Server is running!' });
});

// Room statistics endpoint
app.get('/stats', (req, res) => {
    const stats = getRoomStats();
    res.json({
        message: 'TikTalk Server Statistics',
        ...stats
    });
});

// Start server without MongoDB for now
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
