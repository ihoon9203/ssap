import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    try {
        const { scheduleId } = await req.json();

        if (!scheduleId) {
            return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
        }

        // 1. Supabase에서 해당 스케줄에 연결된 모든 디스코드 채널 정보 가져오기
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE!
        );

        const { data: integrations, error: dbError } = await supabaseAdmin
            .from("discord_integrations")
            .select("discord_channel_id")
            .eq("schedule_id", scheduleId);

        if (dbError || !integrations || integrations.length === 0) {
            return NextResponse.json({ error: "연동 정보를 찾을 수 없습니다." }, { status: 404 });
        }

        const results = [];

        // 2. 검색된 모든 채널에 메시지 발송
        for (const integration of integrations) {
            const channelId = integration.discord_channel_id;

            try {
                const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${process.env.DISCORD_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        content: "👋 안녕하세요! 이것은 테스트 메시지입니다.\n스케줄 알림이 정상적으로 연동되었습니다.",
                        embeds: [{
                            title: "테스트 성공",
                            description: `스케줄 ID: ${scheduleId} 에 연결된 알림입니다.`,
                            color: 5814783,
                        }]
                    }),
                });

                if (response.ok) {
                    results.push({ channelId, status: "success" });
                } else {
                    const errorJson = await response.json();
                    console.error(`Failed to send to ${channelId}:`, errorJson);
                    results.push({ channelId, status: "failed", error: errorJson });
                }
            } catch (e: any) {
                console.error(`Error sending to ${channelId}:`, e);
                results.push({ channelId, status: "error", message: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `${integrations.length}개 채널 중 ${results.filter(r => r.status === 'success').length}개 전송 성공`,
            details: results
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}