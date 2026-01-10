import { NextRequest, NextResponse } from "next/server";
import {
    verifyKey,
    InteractionType,
    InteractionResponseType,
} from "discord-interactions";
// 1. 기존 createClient 대신 supabase-js 라이브러리 직접 import
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
    // ... (서명 검증 로직은 기존과 동일) ...
    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const rawBody = await request.text();

    if (!signature || !timestamp) {
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
    }

    const isValidRequest = verifyKey(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY!
    );

    if (!isValidRequest) {
        return NextResponse.json({ error: "Invalid request signature" }, { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    if (interaction.type === InteractionType.PING) {
        return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const { name, options } = interaction.data;

        if (name === "ssap-connect") {
            const inviteCodeOption = options?.find((o: any) => o.name === "invite_code");
            let rawValue = inviteCodeOption?.value as string;
            let scheduleId = rawValue;

            if (rawValue && rawValue.startsWith("schedule_id:")) {
                scheduleId = rawValue.replace("schedule_id:", "").trim();
            }

            const guildId = interaction.guild_id;
            const channelId = interaction.channel_id;

            if (scheduleId && channelId) {
                try {
                    // 2. [핵심 변경] Service Role Key를 사용해 Admin 클라이언트 생성
                    // 이 클라이언트는 RLS 정책을 모두 무시하고 데이터를 조작할 수 있습니다.
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE!
                    );

                    // 3. discord_integrations 테이블 Insert (Admin 클라이언트 사용)
                    const { data: integration, error: insertError } = await supabaseAdmin
                        .from("discord_integrations")
                        .insert({
                            schedule_id: scheduleId,
                            discord_channel_id: channelId,
                            discord_server_id: guildId || "dm",
                            notification_settings: { events: ["update", "confirm"] }
                        })
                        .select("id")
                        .single();

                    if (insertError) {
                        console.error("DB Insert Error:", insertError);
                        return NextResponse.json({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: `❌ DB Error: ${insertError.message}` }
                        });
                    }

                    // 4. schedules 테이블 Update (Admin 클라이언트 사용)
                    // 기존 배열 가져오기
                    const { data: schedule } = await supabaseAdmin
                        .from("schedules")
                        .select("discord_channel_ids")
                        .eq("id", scheduleId)
                        .single();

                    const currentIds = schedule?.discord_channel_ids || [];
                    const newIds = Array.from(new Set([...currentIds, integration.id]));

                    const { error: updateError } = await supabaseAdmin
                        .from("schedules")
                        .update({ discord_channel_ids: newIds })
                        .eq("id", scheduleId);

                    if (updateError) {
                        return NextResponse.json({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: { content: `❌ Schedule Update Error: ${updateError.message}` }
                        });
                    }

                    return NextResponse.json({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `✅ 스케줄(ID: ${scheduleId})과 현재 채널이 연결되었습니다!`
                        }
                    });

                } catch (e) {
                    console.error("Interaction Handler Error:", e);
                    return NextResponse.json({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: `❌ Internal Server Error` }
                    });
                }
            }
            // ... (이하 동일)
        }
    }
    return NextResponse.json({ type: InteractionResponseType.PONG });
}