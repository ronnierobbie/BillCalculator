import * as React from "react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
    <div className="relative">
        <select
            ref={ref}
            className={cn(
                "flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input/80 bg-background/80 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
        <svg
            className="absolute right-3 top-3.5 h-4 w-4 opacity-60 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    </div>
))
Select.displayName = "Select"

export { Select }
