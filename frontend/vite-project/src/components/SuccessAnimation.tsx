import { CheckCircle, Users } from "lucide-react"
import { Card, CardContent } from "./ui/card"

interface SuccessAnimationProps {
  type: "created" | "joined"
  username: string
  roomNumber: string
}

export function SuccessAnimation({ type, username, roomNumber }: SuccessAnimationProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-600">Success!</h3>
                <p className="text-muted-foreground">
                  {type === "created" ? "Anonymous room created successfully" : "Joined anonymous room successfully"}
                </p>
              </div>
            </div>

            {/* Room Info */}
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Welcome to Anonymous Room</span>
              </div>
              <p className="text-2xl font-mono font-bold text-green-600">{roomNumber}</p>
              <p className="text-sm text-muted-foreground">
                Hello, <span className="font-medium">{username}</span>!
              </p>
            </div>

            {/* Redirect message */}
            <p className="text-xs text-muted-foreground animate-pulse">
              Taking you to the anonymous chat room...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
