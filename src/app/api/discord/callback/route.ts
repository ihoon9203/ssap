
import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const scheduleId = searchParams.get("state");
    const guildId = searchParams.get("guild_id");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(new URL(`/schedule/${scheduleId}?error=${error}`, request.url));
    }

    if (!code || !scheduleId) {
        return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    try {
        // Exchange Code for Token & Webhook Info
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID!,
                client_secret: process.env.DISCORD_CLIENT_SECRET!,
                grant_type: "authorization_code",
                code: code,
                redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/discord/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Token Exchange Error:", errorText);
            return NextResponse.redirect(new URL(`/schedule/${scheduleId}?error=token_exchange_failed`, request.url));
        }

        const tokenData = await tokenResponse.json();
        const { webhook, guild } = tokenData;

        if (!webhook) {
            // User authorized but didn't select a channel (or scope issues)
            console.error("No webhook data returned");
            return NextResponse.redirect(new URL(`/schedule/${scheduleId}?error=no_channel_selected`, request.url));
        }

        const supabase = await createClient();

        // 1. Insert into discord_integrations
        const { data: integration, error: iError } = await supabase
            .from("discord_integrations")
            .insert({
                schedule_id: scheduleId,
                discord_channel_id: webhook.channel_id,
                discord_server_id: guild?.id || guildId,
                channel_name: webhook.name,
                webhook_id: webhook.id,
                webhook_token: webhook.token,
                webhook_url: webhook.url,
                notification_settings: { events: ["update", "confirm"] },
            })
            .select("id")
            .single();

        if (iError) {
            console.error("DB Insert Error:", iError);
            return NextResponse.redirect(new URL(`/schedule/${scheduleId}?error=db_error`, request.url));
        }

        // 2. Update Schedule
        // Fetch current array first to append
        const { data: schedule } = await supabase
            .from("schedules")
            .select("discord_channel_ids")
            .eq("id", scheduleId)
            .single();

        const uniqueIds = new Set(schedule?.discord_channel_ids || []);
        uniqueIds.add(integration.id);

        await supabase
            .from("schedules")
            .update({ discord_channel_ids: Array.from(uniqueIds) })
            .eq("id", scheduleId);

        // Success Redirect
        return NextResponse.redirect(new URL(`/schedule/${scheduleId}?bot_added=true`, request.url));

    } catch (err) {
        console.error("Callback Error:", err);
        return NextResponse.redirect(new URL(`/schedule/${scheduleId}?error=internal_error`, request.url));
    }
}
