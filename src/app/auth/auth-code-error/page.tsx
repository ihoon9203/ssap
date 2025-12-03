import Link from "next/link";

export default function AuthErrorPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-lg text-center">
                <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
                <p className="text-muted-foreground">
                    There was a problem logging you in. This usually happens if the login was cancelled or if the session expired.
                </p>
                <div className="pt-4">
                    <Link
                        href="/login"
                        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Try Again
                    </Link>
                </div>
            </div>
        </main>
    );
}
