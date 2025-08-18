import { MessageCircle, Users, Wifi, CheckCircle } from "lucide-react"
import { Card, CardContent } from "./ui/card"
import { Spinner } from "./ui/spinner"
import { useState, useEffect } from "react"

interface LoadingStepsProps {
  type: "creating" | "joining"
  username: string
  roomNumber?: string
}

export function LoadingSteps({ type, username, roomNumber }: LoadingStepsProps) {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      id: 1,
      label: type === "creating" ? "Creating anonymous room..." : "Finding anonymous room...",
      icon: MessageCircle,
      delay: 0
    },
    {
      id: 2,
      label: "Connecting securely...",
      icon: Wifi,
      delay: 800
    },
    {
      id: 3,
      label: type === "creating" ? "Setting up anonymous space..." : "Joining anonymous conversation...",
      icon: Users,
      delay: 1600
    },
    {
      id: 4,
      label: "Anonymous chat ready...",
      icon: CheckCircle,
      delay: 2200
    }
  ]

  useEffect(() => {
    steps.forEach((step, index) => {
      setTimeout(() => {
        setActiveStep(index)
      }, step.delay)
    })
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">
                {type === "creating" ? "Creating Anonymous Room" : "Joining Anonymous Room"}
              </h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Welcome, <span className="font-medium text-blue-600">{username}</span>!</p>
                {roomNumber && (
                  <p>Room Code: <span className="font-mono bg-muted px-2 py-1 rounded text-purple-600">{roomNumber}</span></p>
                )}
              </div>
            </div>

            {/* Loading Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <LoadingStep
                  key={step.id}
                  step={step}
                  isActive={index <= activeStep}
                  isCompleted={index < activeStep}
                  delay={step.delay}
                />
              ))}
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Step {activeStep + 1} of {steps.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface LoadingStepProps {
  step: {
    id: number
    label: string
    icon: React.ComponentType<{ className?: string }>
    delay: number
  }
  isActive: boolean
  isCompleted: boolean
  delay: number
}

function LoadingStep({ step, isActive, isCompleted, delay }: LoadingStepProps) {
  const Icon = step.icon

  return (
    <div 
      className={`flex items-center gap-3 transition-all duration-500 ${
        isActive ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-2'
      }`}
      style={{ 
        transitionDelay: `${delay}ms`
      }}
    >
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
          isCompleted 
            ? 'bg-green-100 dark:bg-green-900' 
            : isActive 
              ? 'bg-blue-100 dark:bg-blue-900' 
              : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Icon className={`w-4 h-4 ${
              isActive 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-400'
            }`} />
          )}
        </div>
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium transition-colors duration-300 ${
          isCompleted 
            ? 'text-green-600 dark:text-green-400' 
            : isActive 
              ? 'text-foreground' 
              : 'text-muted-foreground'
        }`}>
          {step.label}
        </p>
      </div>
      <div className="flex-shrink-0">
        {isActive && !isCompleted && (
          <Spinner size="sm" className="text-blue-500" />
        )}
        {isCompleted && (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>
    </div>
  )
}
