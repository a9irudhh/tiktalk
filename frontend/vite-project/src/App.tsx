import { useState, useEffect, useRef } from 'react'
import io, { Socket } from 'socket.io-client'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card'
import { Label } from './components/ui/label'
import { Avatar, AvatarFallback } from './components/ui/avatar'
import { ScrollArea } from './components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog'
import { ThemeProvider } from './components/theme-provider'
import { ModeToggle } from './components/mode-toggle'
import { LoadingSteps } from './components/LoadingSteps'
import { LoadingButton } from './components/LoadingButton'
import { SuccessAnimation } from './components/SuccessAnimation'
import { MessageCircle, Users, Send, ArrowLeft, Plus, LogIn, Hash, Sparkles, Copy, Check, AlertTriangle } from 'lucide-react'
import './index.css'

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
  const [showParticipants, setShowParticipants] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'creating' | 'joining' | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connectSocket = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
    const newSocket = io(backendUrl)
    setSocket(newSocket)

    newSocket.on('joinConfirmed', () => {
      // Show success animation first
      setIsLoading(false)
      setShowSuccess(true)
      
      // Then transition to chat after a brief delay
      setTimeout(() => {
        setCurrentPage('chat')
        setError('')
        setShowSuccess(false)
        setLoadingType(null)
      }, 1500)
    })

    newSocket.on('error', (data) => {
      setError(data.message || 'An error occurred')
      setIsLoading(false)
      setLoadingType(null)
    })

    newSocket.on('participants', (participants) => {
      setParticipants(participants)
    })

    newSocket.on('chat', (messageData) => {
      setMessages(prev => [...prev, {
        user: messageData.name,
        message: messageData.message,
        timestamp: messageData.timestamp
      }])
    })

    newSocket.on('typing', (data) => {
      const { name, typing } = data
      if (typing) {
        setTypingUsers(prev => [...prev.filter(user => user !== name), name])
      } else {
        setTypingUsers(prev => prev.filter(user => user !== name))
      }
    })

    return newSocket
  }

  const joinRoom = () => {
    if (!roomNumber.trim() || !username.trim()) {
      setError('Please enter both room code and anonymous name')
      return
    }

    setError('')
    setIsLoading(true)
    setLoadingType('joining')
    
    const newSocket = connectSocket()
    newSocket.emit('join', { room: roomNumber, name: username })
  }

  const createRoom = () => {
    if (!username.trim()) {
      setError('Please enter an anonymous name')
      return
    }

    setError('')
    setIsLoading(true)
    setLoadingType('creating')

    const newRoomNumber = Math.floor(100000 + Math.random() * 900000).toString()
    setRoomNumber(newRoomNumber)
    
    const newSocket = connectSocket()
    newSocket.emit('join', { room: newRoomNumber, name: username })
  }

  const sendMessage = () => {
    if (!message.trim() || !socket || isSending) return
    
    setIsSending(true)
    
    socket.emit('chat', {
      message: message.trim(),
      name: username
    })
    setMessage('')
    
    // Reset sending state after a brief delay
    setTimeout(() => {
      setIsSending(false)
    }, 300)
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
      socket.emit('exit', { room: roomNumber, name: username })
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
    setShowParticipants(false)
    setShowLeaveDialog(false)
    setIsLoading(false)
    setLoadingType(null)
    setShowSuccess(false)
    setIsSending(false)
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-2 lg:p-4 flex flex-col">
          {/* Loading overlay */}
          {isLoading && loadingType && (
            <LoadingSteps 
              type={loadingType} 
              username={username}
              roomNumber={loadingType === 'joining' ? roomNumber : undefined}
            />
          )}

          {/* Success overlay */}
          {showSuccess && loadingType && (
            <SuccessAnimation 
              type={loadingType === 'creating' ? 'created' : 'joined'}
              username={username}
              roomNumber={roomNumber}
            />
          )}
          
          <div className="max-w-8xl mx-auto w-full flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TikTalk
                  </h1>
                  <p className="text-sm text-muted-foreground">Anonymous chat rooms</p>
                </div>
              </div>
              <ModeToggle />
            </div>

            {/* Home Page */}
            {currentPage === 'home' && (
              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold">Welcome to TikTalk</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Join anonymous chat rooms for private conversations without revealing your identity.
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
                          Create Anonymous Room
                        </CardTitle>
                        <CardDescription>
                          Start a new anonymous chat room and share the room code
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="create-username">Anonymous Name</Label>
                          <Input
                            id="create-username"
                            placeholder="Enter your anonymous name"
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
                        <LoadingButton 
                          onClick={createRoom} 
                          className="w-full" 
                          size="lg"
                          loading={isLoading && loadingType === 'creating'}
                          loadingText="Creating..."
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Anonymous Room
                        </LoadingButton>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="join" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Hash className="w-5 h-5 text-green-500" />
                          Join Anonymous Room
                        </CardTitle>
                        <CardDescription>
                          Enter a room code to join an anonymous conversation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="join-room">Room Code</Label>
                          <Input
                            id="join-room"
                            placeholder="Enter room code"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="join-username">Anonymous Name</Label>
                          <Input
                            id="join-username"
                            placeholder="Enter your anonymous name"
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
                        <LoadingButton 
                          onClick={joinRoom} 
                          className="w-full" 
                          size="lg"
                          loading={isLoading && loadingType === 'joining'}
                          loadingText="Joining..."
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Join Room
                        </LoadingButton>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Chat Room */}
            {currentPage === 'chat' && (
              <div className="flex flex-col lg:flex-row gap-4 w-full relative" style={{ height: 'calc(100vh - 180px)' }}>
                {/* Participants Sidebar - Left (Desktop) / Modal (Mobile) */}
                <div className={`
                  w-full lg:w-72 lg:flex-none lg:order-1 lg:relative
                  ${showParticipants ? 'fixed' : 'hidden'} lg:block
                  ${showParticipants ? 'inset-0 z-50 bg-black/50 lg:bg-transparent' : ''}
                  lg:z-auto lg:inset-auto
                `}>
                  <div className={`
                    h-full lg:h-full
                    ${showParticipants ? 'absolute right-0 top-0 w-80 lg:w-72 lg:relative lg:right-auto lg:top-auto' : ''}
                  `}>
                    <Card className="h-full">
                      <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between lg:justify-start">
                        <CardTitle className="flex items-center gap-3 text-base">
                          <Users className="w-4 h-4 text-green-500" />
                          Anonymous Users ({participants.length})
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowParticipants(false)}
                          className="lg:hidden"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="px-4 py-2">
                        <ScrollArea className="h-[calc(100vh-160px)] lg:h-[calc(100vh-200px)]">
                          <div className="space-y-2 py-2">
                            {participants.map((participant) => (
                              <div key={participant} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback 
                                    className={`text-xs font-medium ${
                                      participant === username ? 'bg-blue-500 text-white' : 'bg-muted'
                                    }`}
                                  >
                                    {getInitials(participant)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {participant}
                                  </p>
                                  {participant === username && (
                                    <p className="text-xs text-muted-foreground">You</p>
                                  )}
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Chat Area - Right (Full width) */}
                <div className="flex-1 lg:order-2 flex flex-col min-h-0 h-full">
                  <Card className="h-full flex flex-col min-h-0 overflow-hidden mobile-chat-layout">
                    {/* Header */}
                    <CardHeader className="border-b px-4 py-3 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                              >
                                <ArrowLeft className="w-5 h-5" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  Leave Room?
                                </DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to leave the anonymous chat room? You'll need the room code to rejoin.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowLeaveDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={leaveRoom}
                                >
                                  Leave Room
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <div>
                            <CardTitle className="flex items-center gap-3 text-xl">
                              <Hash className="w-5 h-5 text-blue-500" />
                              Anonymous Room {roomNumber}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyRoomNumber}
                                    className="h-8 w-8 p-0"
                                  >
                                    {copied ? (
                                      <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{copied ? 'Copied!' : 'Copy room code'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </CardTitle>
                            <CardDescription className="text-base mt-1">
                              {participants.length} anonymous user{participants.length !== 1 ? 's' : ''} online
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Mobile Participants Button */}
                          <Button
                            variant="outline"
                            onClick={() => setShowParticipants(true)}
                            className="lg:hidden flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            <span>{participants.length}</span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowLeaveDialog(true)}
                            className="hidden lg:flex gap-2"
                            size="lg"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Leave Room
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Messages Area - Full Height */}
                    <div className="flex-1 p-0 min-h-0 overflow-hidden mobile-chat-messages">
                      <ScrollArea className="h-full px-4 py-4">
                        <div className="space-y-4 w-full">
                          {messages.map((msg, index) => (
                            <div
                              key={index}
                              className={`flex gap-4 ${
                                msg.user === username ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {msg.user !== username && (
                                <Avatar className="w-10 h-10 mt-1 flex-shrink-0">
                                  <AvatarFallback className="text-sm font-medium">
                                    {getInitials(msg.user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div
                                className={`min-w-0 max-w-[85%] lg:max-w-[75%] ${
                                  msg.user === username ? 'text-right' : 'text-left'
                                }`}
                              >
                                <div
                                  className={`inline-block rounded-2xl px-5 py-3 max-w-full ${
                                    msg.user === username
                                      ? 'bg-blue-500 text-white message-bubble-right'
                                      : 'bg-muted message-bubble-left'
                                  }`}
                                >
                                  {msg.user !== username && (
                                    <p className="text-xs font-semibold mb-2 opacity-70 break-words">
                                      {msg.user}
                                    </p>
                                  )}
                                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere message-content">
                                    {msg.message}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 px-1 break-words">
                                  {formatTime(msg.timestamp)}
                                </p>
                              </div>
                              {msg.user === username && (
                                <Avatar className="w-10 h-10 mt-1 flex-shrink-0">
                                  <AvatarFallback className="text-sm font-medium bg-blue-500 text-white">
                                    {getInitials(msg.user)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          
                          {typingUsers.length > 0 && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground px-4">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                              </div>
                              <span className="break-words">
                                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                              </span>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Message Input - Full Width */}
                    <div className="px-4 py-4 border-t bg-muted/30 flex-shrink-0 mobile-chat-input">
                      <div className="flex gap-3 w-full">
                        <Input
                          placeholder="Type your anonymous message..."
                          value={message}
                          onChange={(e) => {
                            setMessage(e.target.value)
                            handleTyping()
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && !isSending && sendMessage()}
                          className="flex-1 bg-background h-12 text-base px-4 resize-none"
                        />
                        <LoadingButton 
                          onClick={sendMessage} 
                          size="lg" 
                          className="px-6 h-12 flex-shrink-0"
                          loading={isSending}
                          disabled={!message.trim()}
                        >
                          <Send className="w-5 h-5" />
                        </LoadingButton>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer - Always at bottom */}
          <footer className="mt-auto py-2 border-t border-border/10">
            <div className="max-w-8xl mx-auto text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} Made by Anirudh R H
              </p>
            </div>
          </footer>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
