"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="system"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-white group-[.toaster]:text-black group-[.toaster]:border-2 group-[.toaster]:border-black group-[.toaster]:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono",
                    description: "group-[.toast]:text-gray-500",
                    actionButton:
                        "group-[.toast]:bg-black group-[.toast]:text-white",
                    cancelButton:
                        "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500",
                },
            }}
            {...props}
        />
    )
}

import { toast } from "sonner"
export { Toaster, toast }
