
const DISCORD_API_BASE = "https://discord.com/api/v10";

export async function sendDiscordMessage(channelId: string, content: string, embeds?: any[]) {
    // 1. 토큰 확인 로그
    console.log("Using Token:", process.env.DISCORD_BTOKEN ? "Loaded (Hidden)" : "MISSING");

    const botToken = process.env.DISCORD_TOKEN;
    if (!botToken) return;

    try {
        const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${botToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ content, embeds }),
        });

        // 2. 응답 상태 로그
        console.log(`Discord API Status: ${res.status}`);

        if (!res.ok) {
            const errorData = await res.json();
            // 3. 실패 원인 출력
            console.error("❌ Discord Send Failed:", JSON.stringify(errorData, null, 2));
            return;
        }

        console.log("✅ Message Sent Successfully!");
        return await res.json();
    } catch (error) {
        console.error("Network/Code Error:", error);
    }
}