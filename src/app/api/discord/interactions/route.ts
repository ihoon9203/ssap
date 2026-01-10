import { NextRequest, NextResponse } from "next/server";
import {
    verifyKey,
    InteractionType,
    InteractionResponseType,
} from "discord-interactions";
// 1. 기존 createClient 대신 supabase-js 라이브러리 직접 import
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

async function updateInteraction(
    applicationId: string,
    token: string,
    payload: any
) {
    const url = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`;
    try {
        const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            console.error("Failed to update interaction:", await res.text());
        }
    } catch (err) {
        console.error("Network error updating interaction:", err);
    }
}

export async function POST(request: NextRequest) {
    // ... (서명 검증 로직은 기존과 동일) ...
    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const rawBody = await request.text();

    if (!signature || !timestamp) {
        return NextResponse.json(
            { error: "Missing signature headers" },
            { status: 401 }
        );
    }

    const isValidRequest = verifyKey(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY!
    );

    if (!isValidRequest) {
        return NextResponse.json(
            { error: "Invalid request signature" },
            { status: 401 }
        );
    }

    const interaction = JSON.parse(rawBody);

    // [수정 1] PING 처리: 혹시 모를 Enum 오류에 대비해 숫자 1도 체크
    if (interaction.type === InteractionType.PING || interaction.type === 1) {
        return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // [수정 2] APPLICATION_COMMAND (명령어): Enum이 동작하지 않을 경우를 대비해 숫자 2를 직접 체크 (여기가 핵심 원인 해결)
    if (
        interaction.type === InteractionType.APPLICATION_COMMAND ||
        interaction.type === 2
    ) {
        const { name, options } = interaction.data;

        if (name === "ssap-connect") {
            const inviteCodeOption = options?.find(
                (o: any) => o.name === "invite_code"
            );
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
                    console.log(scheduleId, channelId, guildId);
                    const { data: existing } = await supabaseAdmin
                        .from("discord_integrations")
                        .select("id")
                        .match({
                            schedule_id: scheduleId,
                            discord_channel_id: channelId,
                            discord_server_id: guildId || "dm",
                        });

                    if (existing != null && existing!.length > 0) {
                        return NextResponse.json({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: `⚠️ **이미 추가되었습니다.**\n이 채널은 해당 스케줄과 이미 연결되어 있습니다.`,
                            },
                        });
                    }
                    else {
                        const { data: integration, error: insertError } = await supabaseAdmin
                            .from("discord_integrations")
                            .insert({
                                schedule_id: scheduleId,
                                discord_channel_id: channelId,
                                discord_server_id: guildId || "dm",
                                notification_settings: { events: ["update", "confirm"] },
                            })
                            .select("id")
                            .single();

                        if (insertError) {
                            console.error("DB Insert Error:", insertError);
                            return NextResponse.json({
                                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                                data: { content: `❌ DB Error: ${insertError.message}` },
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
                                data: {
                                    content: `❌ Schedule Update Error: ${updateError.message}`,
                                },
                            });
                        }

                        return NextResponse.json({
                            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                            data: {
                                content: `✅ 스케줄(ID: ${scheduleId})과 현재 채널이 연결되었습니다!`,
                            },
                        });
                    }
                } catch (e) {
                    console.error("Interaction Handler Error:", e);
                    return NextResponse.json({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: `❌ Internal Server Error` },
                    });
                }
            }
        }
        if (name === "연동해제") {
            // [Step 1] 즉시 "로딩 중..." 응답 반환 (3초 타임아웃 방지)
            const deferredResponse = NextResponse.json({
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            });

            // [Step 2] 백그라운드 작업 시작 (waitUntil 사용)
            waitUntil(
                (async () => {
                    const applicationId = interaction.application_id;
                    const token = interaction.token;
                    const channelId = interaction.channel_id;

                    try {
                        const supabaseAdmin = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE!
                        );

                        // 1. Fetch integrations for this channel
                        const { data: integrations, error } = await supabaseAdmin
                            .from("discord_integrations")
                            .select("id, schedule_id")
                            .eq("discord_channel_id", channelId);

                        if (error || !integrations || integrations.length === 0) {
                            await updateInteraction(applicationId, token, {
                                content: `❌ 이 채널에 연동된 스케줄이 없습니다.`,
                            });
                            return;
                        }

                        if (integrations.length === 1) {
                            // --- Case A: 1개일 때 즉시 삭제 ---
                            const integration = integrations[0];
                            const scheduleId = integration.schedule_id;

                            await supabaseAdmin
                                .from("discord_integrations")
                                .delete()
                                .eq("id", integration.id);

                            // Update schedule
                            const { data: schedule } = await supabaseAdmin
                                .from("schedules")
                                .select("discord_channel_ids")
                                .eq("id", scheduleId)
                                .single();

                            if (schedule) {
                                const currentIds = schedule.discord_channel_ids || [];
                                const newIds = currentIds.filter(
                                    (id: string) => id !== integration.id
                                );
                                await supabaseAdmin
                                    .from("schedules")
                                    .update({ discord_channel_ids: newIds })
                                    .eq("id", scheduleId);
                            }

                            // 성공 메시지로 업데이트
                            await updateInteraction(applicationId, token, {
                                content: `✅ 연동이 해제되었습니다.`,
                            });
                        } else {
                            // --- Case B: 여러 개일 때 선택 메뉴 표시 ---
                            const scheduleIds = integrations.map((i) => i.schedule_id);
                            const { data: schedules } = await supabaseAdmin
                                .from("schedules")
                                .select("id, title")
                                .in("id", scheduleIds);

                            const options =
                                schedules?.map((s) => ({
                                    label: s.title || "제목 없음",
                                    value: s.id,
                                    description: `ID: ${s.id.slice(0, 8)}...`,
                                })) || [];
                            console.log(`length: **${integrations.length}**`);
                            console.log("options: ", integrations);
                            // 선택 메뉴로 업데이트
                            await updateInteraction(applicationId, token, {
                                content: `⚠️ 이 채널에는 **${integrations.length}개**의 스케줄이 연결되어 있습니다.\n해제할 스케줄을 선택해주세요.`,
                                components: [
                                    {
                                        type: 1, // Action Row
                                        components: [
                                            {
                                                type: 3, // String Select Menu
                                                custom_id: "disconnect_select",
                                                options: options,
                                                placeholder: "연동을 해제할 스케줄 선택",
                                            },
                                        ],
                                    },
                                ],
                            });
                        }
                    } catch (err) {
                        console.error("Background Job Error:", err);
                        // 에러 메시지로 업데이트
                        await updateInteraction(applicationId, token, {
                            content: `❌ 처리 중 오류가 발생했습니다.`,
                        });
                    }
                })()
            );

            return deferredResponse;
        }

        // ... (settings stub)
        if (name === "ssap-settings") {
            return NextResponse.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `🚧 **알림 설정** 기능은 준비 중입니다.` },
            });
        }
    } // End of APPLICATION_COMMAND

    // ---------------------------------------------------------
    // 4. Handle Message Component Interactions (Select Menu)
    // ---------------------------------------------------------
    // [수정 3] MESSAGE_COMPONENT: Enum 오류 대비 숫자 3 직접 체크
    if (
        interaction.type === InteractionType.MESSAGE_COMPONENT ||
        interaction.type === 3
    ) {
        const { custom_id, values } = interaction.data;

        if (custom_id === "disconnect_select") {
            const selectedScheduleId = values[0];
            const channelId = interaction.channel_id;

            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE!
                );

                // 1. Find the specific integration
                const { data: integration } = await supabaseAdmin
                    .from("discord_integrations")
                    .select("id")
                    .match({
                        schedule_id: selectedScheduleId,
                        discord_channel_id: channelId,
                    })
                    .single();

                if (!integration) {
                    return NextResponse.json({
                        type: InteractionResponseType.UPDATE_MESSAGE,
                        data: {
                            content: `❌ 이미 해제되었거나 찾을 수 없습니다.`,
                            components: [],
                        },
                    });
                }

                // 2. Delete
                await supabaseAdmin
                    .from("discord_integrations")
                    .delete()
                    .eq("id", integration.id);

                // 3. Update Schedule
                const { data: schedule } = await supabaseAdmin
                    .from("schedules")
                    .select("discord_channel_ids")
                    .eq("id", selectedScheduleId)
                    .single();

                if (schedule) {
                    const currentIds = schedule.discord_channel_ids || [];
                    const newIds = currentIds.filter(
                        (id: string) => id !== integration.id
                    );
                    await supabaseAdmin
                        .from("schedules")
                        .update({ discord_channel_ids: newIds })
                        .eq("id", selectedScheduleId);
                }

                return NextResponse.json({
                    type: InteractionResponseType.UPDATE_MESSAGE,
                    data: {
                        content: `✅ 선택한 스케줄의 연동이 해제되었습니다.`,
                        components: [], // Remove the select menu
                    },
                });
            } catch (e: any) {
                return NextResponse.json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: `❌ 오류 발생: ${e.message}` },
                });
            }
        }
    } else {
        // [디버깅] 여기서 잡히는 것이 문제였으므로, 로그 유지
        console.log("Unknown Interaction Type:", interaction.type);
        console.log(
            "🚨 처리되지 않은 요청 발생:",
            JSON.stringify(interaction, null, 2)
        );
        return NextResponse.json(
            { error: "Unknown Interaction Type" },
            { status: 400 }
        );
    }
}