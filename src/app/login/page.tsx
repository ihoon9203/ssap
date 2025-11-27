import { AuthButton } from "@/components/auth/AuthButton";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg animate-in fade-in zoom-in duration-500">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome to SSAP</h1>
                    <p className="mt-2 text-muted-foreground">Sign in to manage your schedules</p>
                </div>

                <div className="space-y-4">
                    <AuthButton provider="google" className="border-zinc-200 bg-white text-black hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900">
                        {/* Google Icon SVG */}
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </AuthButton>

                    <AuthButton provider="kakao" className="bg-[#FEE500] text-black hover:bg-[#FDD835] border-none">
                        {/* Kakao Icon SVG */}
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3C5.925 3 1 6.925 1 11.775c0 2.9 1.75 5.5 4.5 7.05-.2.75-.725 2.725-.825 3.125-.125.475.175.475.375.325.25-.175 2.9-1.925 4.025-2.7.95.125 1.925.2 2.925.2 6.075 0 11-3.925 11-8.775S17.075 3 12 3z" />
                        </svg>
                        Continue with Kakao
                    </AuthButton>

                    <AuthButton provider="discord" className="bg-[#5865F2] text-white hover:bg-[#4752C4] border-none">
                        {/* Discord Icon SVG */}
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-.59 1.227 18.312 18.312 0 0 0-5.526 0 13.48 13.48 0 0 0-.59-1.227.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.04.106 14.1 14.1 0 0 0 1.225 1.994.076.076 0 0 0 .084.028 19.9 19.9 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                        </svg>
                        Continue with Discord
                    </AuthButton>
                </div>
            </div>
        </main>
    );
}
