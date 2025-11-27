"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function JoinScheduleInput() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        // TODO: Validate code and redirect
        // For now, just simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Joining schedule:", code);
        setIsLoading(false);
    };

    return (
        <form onSubmit={handleJoin} className="relative w-full max-w-sm">
            <input
                type="text"
                placeholder="Enter invite code..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={cn(
                    "h-12 w-full rounded-full border border-input bg-background px-6 pr-12 text-sm shadow-sm transition-colors",
                    "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className={cn(
                    "absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
                    "disabled:opacity-50 disabled:hover:bg-primary"
                )}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <ArrowRight className="h-4 w-4" />
                )}
                <span className="sr-only">Join Schedule</span>
            </button>
        </form>
    );
}
