"use client";

import { useEffect, useState } from "react";

interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Delay showing the overlay slightly to prevent flashing on super fast loads
        const timer = setTimeout(() => setShow(true), 200);
        return () => clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-all duration-300">
            <div className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-300">
                {/* Simple SVG Spinner to avoid dependencies */}
                <svg
                    className="animate-spin h-12 w-12 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
                <p className="text-lg font-bold font-mono animate-pulse">{message}</p>
                <p className="text-sm text-gray-500 max-w-xs text-center">
                    First load may take a moment to download privacy circuits...
                </p>
            </div>
        </div>
    );
}
