import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    // Check if the redirect URL itself contains an error
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')

    if (errorParam) {
        console.error("[AuthCallback] Error from provider:", errorParam, errorDesc);
        const ignoredError = errorDesc || errorParam; // logic to capture the error
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(ignoredError)}`)
    }

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        console.log("[AuthCallback] Code exchange. Error:", error?.message, "Session User:", data.session?.user?.id);

        if (!error) {
            console.log("[AuthCallback] Redirecting to:", `${origin}${next}`);
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            const errorMessage = error?.message || 'Unknown code exchange error';
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(errorMessage)}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=NoCodeProvided`)
}
