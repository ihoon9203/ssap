"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ButtonHTMLAttributes, useState } from "react";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    provider: "google" | "kakao" | "discord";
    icon?: React.ReactNode;
}

export function AuthButton({ provider, icon, className, children, ...props }: AuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            console.log("signing in with ", provider);
            await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                },
            });
            console.log("signed in with ", provider);
        } catch (error) {
            console.error("Login failed:", error);
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleLogin}
            disabled={isLoading}
            className={cn(
                "flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all hover:bg-muted disabled:opacity-50",
                className
            )}
            {...props}
        >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
            {children}
        </button>
    );
}
