import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Label } from './components/ui/label';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { ScrollArea } from './components/ui/scroll-area';
import { MessageCircle, Users, Send, Copy, Check, Plus, LogIn, ArrowLeft, PhoneOff } from 'lucide-react';

interface Message {
  name: string;
  message: string;
  timestamp: string;
}

interface TypingUser {
  name: string;
  timestamp: number;
}

const SOCKET_URL = 'http://localhost:8000';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'create' | 'join' | 'chat'>('home');
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [currentName, setCurrentName] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [copiedRoom, setCopiedRoom] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentPage === 'chat' && socket) {
      const handleTyping = () => {
        if (!isTyping) {
          setIsTyping(true);
          socket.emit('typing', { room: currentRoom, name: currentName, typing: true });
        }
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          socket.emit('typing', { room: currentRoom, name: currentName, typing: false });
        }, 1000);
      };

      if (messageInput.length > 0) {
        handleTyping();
      } else if (isTyping) {
        setIsTyping(false);
        socket.emit('typing', { room: currentRoom, name: currentName, typing: false });
      }
    }
  }, [messageInput, currentRoom, currentName, socket, isTyping, currentPage]);

  const connectSocket = () => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('joinConfirmed', (data) => {
      setCurrentRoom(data.room);
      setCurrentName(data.name);
      setCurrentPage('chat');
      setError('');
    });

    newSocket.on('participants', (participantsList) => {
      setParticipants(participantsList);
    });

    newSocket.on('chat', (data) => {
      setMessages(prev => [...prev, data]);
    });

    newSocket.on('typing', (data) => {
      if (data.name !== currentName) {
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.name !== data.name);
          if (data.typing) {
            return [...filtered, { name: data.name, timestamp: Date.now() }];
          }
          return filtered;
        });
      }
    });

    newSocket.on('error', (data) => {
      setError(data.message);
    });

    newSocket.on('disconnect', () => {
      setError('Disconnected from server');
    });

    setSocket(newSocket);
    return newSocket;
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = (name: string, roomName: string) => {
    const roomId = generateRoomId();
    joinRoom(name, roomId);
  };

  const joinRoom = (name: string, room: string) => {
    if (!name.trim() || !room.trim()) {
      setError('Please enter both name and room ID');
      return;
    }
    
    const socketConnection = socket || connectSocket();
    socketConnection.emit('join', { name: name.trim(), room: room.toUpperCase() });
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !socket) return;
    
    socket.emit('chat', { message: messageInput.trim(), name: currentName });
    setMessageInput('');
  };

  const leaveRoom = () => {
    if (socket && currentRoom && currentName) {
      socket.emit('exit', { room: currentRoom, name: currentName });
      socket.disconnect();
    }
    
    setSocket(null);
    setCurrentPage('home');
    setCurrentRoom('');
    setCurrentName('');
    setParticipants([]);
    setMessages([]);
    setMessageInput('');
    setError('');
    setTypingUsers([]);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoom);
    setCopiedRoom(true);
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clean up typing users periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => 
        prev.filter(user => Date.now() - user.timestamp < 3000)
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Home Page - Mobile responsive
  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">TikTalk</h1>
            <p className="text-white/90 text-lg">Connect and chat in real-time</p>
          </div>
          
          <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
            <CardContent className="p-6 space-y-4">
              <Button
                onClick={() => setCurrentPage('create')}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-3" />
                Create Room
              </Button>
              
              <Button
                onClick={() => setCurrentPage('join')}
                variant="outline"
                className="w-full h-14 text-lg border-2 hover:bg-blue-50"
                size="lg"
              >
                <LogIn className="w-5 h-5 mr-3" />
                Join Room
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Create Room Page - Mobile responsive
  if (currentPage === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Room</h1>
            <p className="text-white/90">Start a new chat room</p>
          </div>
          
          <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Room Details</CardTitle>
              <CardDescription>Enter your information to create a new room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CreateRoomForm 
                onSubmit={createRoom} 
                onBack={() => setCurrentPage('home')} 
              />
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Join Room Page - Mobile responsive
  if (currentPage === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join Room</h1>
            <p className="text-white/90">Enter a room with ID</p>
          </div>
          
          <Card className="backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Join Existing Room</CardTitle>
              <CardDescription>Enter the room ID and your name to join</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <JoinRoomForm 
                onSubmit={joinRoom} 
                onBack={() => setCurrentPage('home')} 
              />
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Chat Page - Mobile responsive
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Room: {currentRoom}</h1>
              <p className="text-sm text-gray-500">{participants.length} participants</p>
            </div>
          </div>
          <Button
            onClick={copyRoomId}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            {copiedRoom ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex w-80 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Room: {currentRoom}</h2>
            <Button
              onClick={copyRoomId}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              {copiedRoom ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button
            onClick={leaveRoom}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave Room
          </Button>
        </div>
        
        <div className="flex-1 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Participants ({participants.length})
            </span>
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors $&#8203;{
                    participant === currentName ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={`text-xs font-medium $&#8203;{
                      participant === currentName ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                    }`}>
                      {participant.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {participant}
                    </span>
                    {participant === currentName && (
                      <span className="text-xs text-blue-600 ml-2">(You)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="hidden lg:block p-6 bg-white border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {currentName}!
          </h1>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex $&#8203;{
                  message.name === currentName ? 'justify-end' : 'justify-start'
                } animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-xs lg:max-w-md $&#8203;{
                    message.name === currentName ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <Card
                    className={`$&#8203;{
                      message.name === currentName
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <CardContent className="p-3">
                      {message.name !== currentName && (
                        <div className="text-xs font-medium mb-1 text-gray-500">
                          {message.name}
                        </div>
                      )}
                      <div className="text-sm mb-1">{message.message}</div>
                      <div className={`text-xs $&#8203;{
                        message.name === currentName ? 'text-blue-100' : 'text-gray-400'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
            
            {typingUsers.length > 0 && (
              <div className="text-sm text-gray-500 ml-4">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>
                    {typingUsers.map(user => user.name).join(', ')} 
                    {typingUsers.length === 1 ? ' is' : ' are'} typing...
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 h-12"
            />
            <Button
              onClick={sendMessage}
              disabled={!messageInput.trim()}
              className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation for Participants */}
      <div className="lg:hidden bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {participants.slice(0, 4).map((participant, index) => (
              <Avatar key={index} className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={`text-xs $&#8203;{
                  participant === currentName ? 'bg-blue-500' : 'bg-green-500'
                } text-white`}>
                  {participant.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {participants.length > 4 && (
              <div className="text-sm text-gray-500 ml-2">+{participants.length - 4}</div>
            )}
          </div>
          <Button
            onClick={leaveRoom}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <PhoneOff className="w-4 h-4 mr-1" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
};

// Create Room Form Component
const CreateRoomForm: React.FC<{
  onSubmit: (name: string, roomName: string) => void;
  onBack: () => void;
}> = ({ onSubmit, onBack }) => {
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, roomName);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Your Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roomName">Room Name</Label>
        <Input
          id="roomName"
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
          className="h-12"
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
        >
          Create & Join
        </Button>
      </div>
    </form>
  );
};

// Join Room Form Component
const JoinRoomForm: React.FC<{
  onSubmit: (name: string, roomId: string) => void;
  onBack: () => void;
}> = ({ onSubmit, onBack }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, roomId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="joinName">Your Name</Label>
        <Input
          id="joinName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="roomId">Room ID</Label>
        <Input
          id="roomId"
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          placeholder="Enter unique room ID"
          className="h-12 font-mono tracking-wider"
          required
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 bg-green-600 hover:bg-green-700"
        >
          Join Room
        </Button>
      </div>
    </form>
  );
};

export default App;
