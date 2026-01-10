"use server";

import { createClient } from "@/lib/supabase/server";
import { sendDiscordMessage } from "@/lib/discord";
import { Schedule, DiscordIntegration } from "@/models/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function notifyScheduleUpdate(scheduleId: string) {
    console.log(`[Notification] starting for schedule ${scheduleId}`);
    const supabase = await createClient();

    // 1. Fetch Schedule
    const { data: schedule, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();

    if (error || !schedule) {
        console.error("[Notification] Schedule not found or error:", error);
        return { success: false, error: "Schedule not found" };
    }

    const s = schedule as Schedule;

    // 2. Check for linked Discord channels
    if (!s.discord_channel_ids || s.discord_channel_ids.length === 0) {
        console.log("[Notification] No discord channels linked.");
        return { success: true, message: "No channels linked" };
    }

    // 3. Fetch Integration Details
    const { data: integrations, error: intError } = await supabase
        .from("discord_integrations")
        .select("*")
        .in("id", s.discord_channel_ids);

    if (intError || !integrations) {
        console.error("[Notification] Error fetching integrations:", intError);
        return { success: false, error: "Failed to fetch integrations" };
    }

    // 4. Send Notifications
    const scheduleLink = `${BASE_URL}/schedule/${scheduleId}`;
    const messageContent = `📅 **스케줄이 업데이트되었습니다!**\n\n**${s.title}**\n${s.description || ""}\n\n👉 [스케줄 확인하기](${scheduleLink})`;

    const results = await Promise.all(
        (integrations as DiscordIntegration[]).map(async (integration) => {
            if (integration.channel_id) {
                return sendDiscordMessage(integration.channel_id, messageContent);
            }
        })
    );

    console.log(`[Notification] Sent to ${results.length} channels.`);
    return { success: true, sentCount: results.length };
}
