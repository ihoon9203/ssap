"use server";

import { sendDiscordMessage } from "@/lib/discord";
import { Schedule, DiscordIntegration } from "@/models/types";
import { createClient } from "@supabase/supabase-js";


const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function notifyScheduleUpdate(scheduleId: string, actorId: string, changeDescription: string = "스케줄이 업데이트되었습니다.") {
    console.log(`[Notification] starting for schedule ${scheduleId}`);
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE! // Service Role Key 필수
    );

    let actorName = "알 수 없는 사용자";

    const { data: userData, error: userError } = await supabase
        .from("users")
        .select("username")
        .eq("id", actorId)
        .single();

    console.log(`[Notification] User nickname lookup: ${userData?.username}, Error: ${userError?.message}`);

    if (userData?.username) {
        actorName = userData.username;
    }

    // 1. Fetch Schedule
    const { data: schedule, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();

    console.log(`[Notification] Schedule lookup: ${schedule ? "Found" : "Not Found"}, Error: ${error?.message}`);

    if (error || !schedule) {
        console.error("[Notification] Schedule not found or error:", error);
        return { success: false, error: "Schedule not found" };
    }

    const s = schedule as Schedule;
    console.log(`[Notification] Schedule channels: ${JSON.stringify(s.discord_channel_ids)}`);

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

    console.log(`[Notification] Integrations found: ${integrations.length} / ${s.discord_channel_ids.length}`);

    // 4. Send Notifications
    const scheduleLink = `${process.env.NEXT_PUBLIC_BASE_URL}/schedule/${scheduleId}`; // BASE_URL 확인 필요

    const messageContent = `📅 **스케줄 알림**\n\n👤 **${actorName}**님이 변경함:\n📝 **${changeDescription}**\n\n**${s.title}**\n${s.description || ""}\n\n👉 [스케줄 확인하기](${scheduleLink})`;

    console.log(`[Notification] Sending message content:`, messageContent);

    const results = await Promise.all(
        (integrations as any[]).map(async (integration) => {
            // [수정] DB 컬럼명에 맞춰 'discord_channel_id'로 변경
            // (타입스크립트 인터페이스도 'discord_channel_id'여야 합니다)
            const targetChannelId = integration.discord_channel_id;

            if (targetChannelId) {
                console.log(`[Notification] Sending to Discord Channel: ${targetChannelId}`);
                try {
                    const res = await sendDiscordMessage(targetChannelId, messageContent);
                    console.log(`[Notification] Send result for ${targetChannelId}:`, res);
                    return res;
                } catch (e) {
                    console.error(`[Notification] Failed to send to ${targetChannelId}:`, e);
                }
            } else {
                console.warn("[Notification] Missing discord_channel_id in integration record:", integration);
            }
        })
    );

    console.log(`[Notification] Processed ${results.length} integrations.`);
    return { success: true, sentCount: results.length };
}
