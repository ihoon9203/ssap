
const DISCORD_API_BASE = "https://discord.com/api/v10";

export async function sendDiscordMessage(channelId: string, content: string, embeds?: any[]) {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
        console.warn("DISCORD_BOT_TOKEN is not set. Skipping Discord notification.");
        return;
    }

    try {
        const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${botToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content,
                embeds,
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Failed to send Discord message:", errorData);
            throw new Error(`Discord API Error: ${res.status} ${res.statusText}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error in sendDiscordMessage:", error);
        // We might not want to crash the whole request if discord fails
    }
}
