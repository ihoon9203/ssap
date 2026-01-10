
import { NextRequest, NextResponse } from "next/server";
import {
    verifyKey,
    InteractionType,
    InteractionResponseType,
} from "discord-interactions";

export async function POST(request: NextRequest) {
    // 1. Verify the request
    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const rawBody = await request.text();

    if (!signature || !timestamp) {
        return NextResponse.json(
            { error: "Missing signature headers" },
            { status: 401 }
        );
    }


    const isValidRequest = await verifyKey(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY!
    );

    if (!isValidRequest) {
        return NextResponse.json({ error: "Invalid request signature" }, { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    // 2. Handle PING
    if (interaction.type === InteractionType.PING) {
        return NextResponse.json({ type: InteractionResponseType.PONG });
    }

    // 3. Handle Application Commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        // Immediate response to avoid timeout
        return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: `✅ 커맨드 확인!`
            }
        });
    }

    return NextResponse.json({ type: InteractionResponseType.PONG });
}
