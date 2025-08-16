import React, { useState, useEffect, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import { Label } from './components/ui/label'
import { Avatar, AvatarFallback } from './components/ui/avatar'
import { ScrollArea } from './components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import { ThemeProvider } from './components/theme-provider'
import { ModeToggle } from './components/mode-toggle'
import { MessageCircle, Users, Send, ArrowLeft, Plus, LogIn, Hash, Sparkles, Copy, Check } from 'lucide-react'

type Page = 'home' | 'create' | 'join' | 'chat'
type Message = { user: string; message: string; timestamp: string }

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomNumber, setRoomNumber] = useState('')
  const [username, setUsername] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connectSocket = () => {
    const newSocket = io('http://localhost:8000')
    setSocket(newSocket)

    newSocket.on('joined', (data) => {
      setParticipants(data.participants)
      setMessages(data.messages || [])
      setCurrentPage('chat')
      setError('')
    })

    newSocket.on('error', (errorMessage) => {
      setError(errorMessage)
    })

    newSocket.on('userJoined', (data) => {
      setParticipants(data.participants)
    })

    newSocket.on('userLeft', (data) => {
      setParticipants(data.participants)
    })

    newSocket.on('message', (messageData) => {
      setMessages(prev => [...prev, messageData])
    })

    newSocket.on('typing', (data) => {
      setTypingUsers(data.typingUsers || [])
    })

    return newSocket
  }

  const joinRoom = () => {
    if (!roomNumber.trim() || !username.trim()) {
      setError('Please enter both room number and username')
      return
    }

    const newSocket = connectSocket()
    newSocket.emit('join', { room: roomNumber, name: username })
  }

  const createRoom = () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    const newRoomNumber = Math.floor(100000 + Math.random() * 900000).toString()
    setRoomNumber(newRoomNumber)
    
    const newSocket = connectSocket()
    newSocket.emit('join', { room: newRoomNumber, name: username })
  }

  const sendMessage = () => {
    if (!message.trim() || !socket) return
    
    socket.emit('message', {
      room: roomNumber,
      name: username,
      message: message.trim()
    })
    setMessage('')
  }

  const handleTyping = () => {
    if (!socket) return
    
    socket.emit('typing', { room: roomNumber, name: username, typing: true })
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { room: roomNumber, name: username, typing: false })
    }, 1000)
  }

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave', { room: roomNumber, name: username })
      socket.disconnect()
      setSocket(null)
    }
    setCurrentPage('home')
    setRoomNumber('')
    setUsername('')
    setMessages([])
    setParticipants([])
    setMessage('')
    setTypingUsers([])
    setError('')
  }

  const copyRoomNumber = () => {
    navigator.clipboard.writeText(roomNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="tiktalk-theme">
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TikTalk
                  </h1>
                  <p className="text-sm text-muted-foreground">Real-time chat rooms</p>
                </div>
              </div>
              <ModeToggle />
            </div>

            {/* Home Page */}
            {currentPage === 'home' && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold">Welcome to TikTalk</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Create or join chat rooms for real-time conversations with friends and colleagues.
                  </p>
                </div>

                <Tabs defaultValue="create" className="w-full max-w-md mx-auto">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create Room
                    </TabsTrigger>
                    <TabsTrigger value="join" className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Join Room
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-blue-500" />
                          Create New Room
                        </CardTitle>
                        <CardDescription>
                          Start a new chat room and invite others to join
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-username">Your Name</Label>
                          <Input
                            id="create-username"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                          />
                        </div>
                        {error && (
                          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                            {error}
                          </div>
                        )}
                        <Button onClick={createRoom} className="w-full" size="lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Room
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="join" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Hash className="w-5 h-5 text-green-500" />
                          Join Existing Room
                        </CardTitle>
                        <CardDescription>
                          Enter a room number to join an existing conversation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="join-room">Room Number</Label>
                          <Input
                            id="join-room"
                            placeholder="Enter room number"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="join-username">Your Name</Label>
                          <Input
                            id="join-username"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                          />
                        </div>
                        {error && (
                          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                            {error}
                          </div>
                        )}
                        <Button onClick={joinRoom} className="w-full" size="lg">
                          <LogIn className="w-4 h-4 mr-2" />
                          Join Room
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Chat Room */}
            {currentPage === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
                {/* Chat Area */}
                <div className="lg:col-span-3 space-y-4">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={leaveRoom}
                            className="lg:hidden"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </Button>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              Room #{roomNumber}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={copyRoomNumber}
                                    className="h-6 w-6"
                                  >
                                    {copied ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{copied ? 'Copied!' : 'Copy room number'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </CardTitle>
                            <CardDescription>
                              {participants.length} participant{participants.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={leaveRoom}
                          className="hidden lg:flex"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Leave
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-0">
                      <ScrollArea className="h-full p-4">
                        <div className="space-y-4">
                          {messages.map((msg, index) => (
                            <div
                              key={index}
                              className={`flex gap-3 ${
                                msg.user === username ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {msg.user !== username && (
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(msg.user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`max-w-[70%] ${
                                  msg.user === username ? 'text-right' : 'text-left'
                                }`}
                              >
                                <div
                                  className={`inline-block rounded-2xl px-4 py-2 ${
                                    msg.user === username
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {msg.user !== username && (
                                    <p className="text-xs font-medium mb-1 opacity-70">
                                      {msg.user}
                                    </p>
                                  )}
                                  <p className="text-sm">{msg.message}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatTime(msg.timestamp)}
                                </p>
                              </div>
                              {msg.user === username && (
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                                    {getInitials(msg.user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          
                          {typingUsers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                              </div>
                              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </CardContent>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your message..."
                          value={message}
                          onChange={(e) => {
                            setMessage(e.target.value)
                            handleTyping()
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          className="flex-1"
                        />
                        <Button onClick={sendMessage} size="icon">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Participants Sidebar */}
                <div className="lg:col-span-1">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Participants ({participants.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {participants.map((participant) => (
                            <div key={participant} className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback 
                                  className={`text-xs ${
                                    participant === username ? 'bg-blue-500 text-white' : ''
                                  }`}
                                >
                                  {getInitials(participant)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {participant}
                                  {participant === username && (
                                    <span className="text-xs text-muted-foreground ml-1">(You)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
