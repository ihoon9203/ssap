import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This is the schedule_id
    const guild_id = searchParams.get("guild_id");
    const error = searchParams.get("error");

    console.log("[Discord Callback] Received parameters:", { code, state, guild_id, error });

    if (error) {
        console.error("[Discord Callback] Error received:", error);
        return NextResponse.json({ error }, { status: 400 });
    }

    if (!code || !guild_id) {
        console.warn("[Discord Callback] Missing code or guild_id");
        // If simply adding the bot, we might not get a code if we didn't ask for it, 
        // but we asked for response_type=code.
        // However, for just adding a bot to a server, we mainly care about the guild_id returned if the bot was added.
        // Actually, Discord returns guild_id in the redirect if the bot was added.
        // If we want to link the schedule to the channel/guild, we need to know which guild it was added to.
    }

    // If we have a schedule_ID (state) and a guild_id, we can try to find a default channel or just log it.
    // Ideally, we would need the user to select a channel, but for now let's just redirect back to the schedule page.

    if (state) {
        console.log(`[Discord Callback] Redirecting back to schedule: ${state}`);
        // Redirect back to the schedule page
        const redirectUrl = new URL(`/schedule/${state}`, request.url);
        // We can append a query param to show success
        redirectUrl.searchParams.set("bot_added", "true");
        if (guild_id) {
            redirectUrl.searchParams.set("guild_id", guild_id);
        }
        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.json({ message: "Bot added successfully, but lost state." });
}
