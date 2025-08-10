# TikTalk

A real-time chat application built with Socket.IO and Express.js that allows multiple users to join different chat rooms and communicate with each other.

## Features

- **Multiple Chat Rooms**: Users can join specific rooms using room numbers
- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Participant Tracking**: See who's currently in each room
- **Join/Leave Notifications**: Automatic participant list updates when users join or leave
- **User-friendly Interface**: Clean web interface for easy chatting

## Socket.IO Events

### Client to Server Events

1. **`join`** - Join a chat room
   ```javascript
   socket.emit('join', { name: 'Username', room: 'RoomNumber' });
   ```

2. **`chat`** - Send a message
   ```javascript
   socket.emit('chat', { message: 'Hello!', name: 'Username' });
   ```

3. **`exit`** - Leave a room
   ```javascript
   socket.emit('exit', { name: 'Username', room: 'RoomNumber' });
   ```

4. **`getAllNames`** - Get all connected users
   ```javascript
   socket.emit('getAllNames');
   ```

### Server to Client Events

1. **`joinConfirmed`** - Confirmation of successful room join
   ```javascript
   socket.on('joinConfirmed', (data) => {
       // data: { room: 'RoomNumber', name: 'Username' }
   });
   ```

2. **`participants`** - Updated list of room participants
   ```javascript
   socket.on('participants', (participants) => {
       // participants: ['User1', 'User2', 'User3']
   });
   ```

3. **`chat`** - Incoming chat message
   ```javascript
   socket.on('chat', (data) => {
       // data: { message: 'Hello!', name: 'Username', timestamp: '2023-...' }
   });
   ```

4. **`allNames`** - List of all connected users
   ```javascript
   socket.on('allNames', (names) => {
       // names: ['User1', 'User2', 'User3']
   });
   ```

5. **`error`** - Error messages
   ```javascript
   socket.on('error', (error) => {
       // error: { message: 'Error description' }
   });
   ```

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm run dev
   ```

3. **Access the Chat Interface**
   Open your browser and navigate to: `http://localhost:8000`

## Usage

### Web Interface

1. **Join a Room**:
   - Enter your name
   - Enter a room number (any string/number)
   - Click "Join Room"

2. **Chat**:
   - Type messages in the input field
   - Press Enter or click "Send"
   - See messages from all participants in real-time

3. **View Participants**:
   - See all current participants in the right sidebar
   - List updates automatically when users join/leave

4. **Leave Room**:
   - Click "Leave Room" button
   - You'll return to the join screen

### Programmatic Usage

Check `src/client-example.js` for a complete example of how to use the Socket.IO client programmatically.

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000');

// Join a room
socket.emit('join', { name: 'TestUser', room: '123' });

// Send a message
socket.emit('chat', { message: 'Hello!', name: 'TestUser' });

// Listen for messages
socket.on('chat', (data) => {
    console.log(`${data.name}: ${data.message}`);
});
```

## API Endpoints

- **GET /** - Health check endpoint
- **WebSocket Connection** - Socket.IO connection at the same port

## Architecture

The application uses:
- **Express.js** for the HTTP server
- **Socket.IO** for real-time WebSocket communication
- **MongoDB** for data persistence (optional, currently not storing chat history)
- **CORS** enabled for cross-origin requests

## Data Structure

```javascript
// User object stored in server memory
{
    socketId: 'socket_id_string',
    socket: socketObject,
    room: 'room_identifier',
    name: 'user_name'
}
```

## Multiple Room Support

Users can join different rooms simultaneously by using different room identifiers. Each room maintains its own:
- Participant list
- Message history (for the session)
- Join/leave notifications

## Development

### Testing Multiple Users

1. Open multiple browser tabs/windows
2. Join the same room with different names
3. Send messages and observe real-time updates
4. Try different room numbers to test room isolation

### Monitoring

The server logs all major events:
- User connections/disconnections
- Room joins/leaves
- Message sending
- Errors

Check the console output for debugging information.

## Contributing

Feel free to add features like:
- Message persistence in MongoDB
- Private messaging
- Room creation with passwords
- File sharing
- Typing indicators
- Message history
- User authentication
