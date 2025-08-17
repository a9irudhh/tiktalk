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

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tiktalk-gamma.vercel.app';
const PORT = process.env.PORT || 8000;

// Allow multiple origins for development and production
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://tiktalk-gamma.vercel.app',
    'https://tiktalk-gamma.vercel.app/',
    FRONTEND_URL,
    FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL + '/'
].filter((origin, index, self) => origin && self.indexOf(origin) === index);

console.log('Allowed CORS origins:', allowedOrigins);

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

            // console.log(`${trimmedName} joined room ${room}`);
            const roomParticipants = allSockets
                .filter(user => user.room === room)
                .map(user => user.name);

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
            allSockets = allSockets.filter(user => 
                !(user.room === room && user.name === name)
            );

            // Leave the room
            socket.leave(room);
            const roomParticipants = allSockets
                .filter(user => user.room === room)
                .map(user => user.name);

            io.to(room).emit('participants', roomParticipants);
            // console.log(`${name} left room ${room}`);

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
                allSockets = allSockets.filter(user => user.socketId !== socket.id);

                const roomParticipants = allSockets
                    .filter(user => user.room === room)
                    .map(user => user.name);
                io.to(room).emit('participants', roomParticipants);

                // console.log(`${name} disconnected from room ${room}`);
            }
        } catch (error) {
            console.log('Error in disconnect event:', error);
        }
    });
});

// health check
app.get('/', (req, res) => {
    res.json({ message: 'TikTalk Socket.IO Chat Server is running!' });
});

// Start server without MongoDB for now
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
