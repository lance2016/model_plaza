"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const variant = props.variant
        let icon = null
        
        if (variant === "success") {
          icon = <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        } else if (variant === "destructive") {
          icon = <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        } else if (title || description) {
          icon = <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        }

        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3 flex-1">
              {icon}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
