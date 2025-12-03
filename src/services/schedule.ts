import { createClient } from "@/lib/supabase/client";
import { addDays, addMinutes, startOfDay } from "date-fns";

export interface SaveAvailabilityParams {
    scheduleId: string;
    startDate: Date;
    availabilities: { [key: string]: number };
}

export async function saveAvailability({
    scheduleId,
    startDate,
    availabilities,
}: SaveAvailabilityParams) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to save availability.");
    }

    // 1. Get Participant ID
    let { data: participant, error: participantError } = await supabase
        .from("participants")
        .select("id")
        .eq("schedule_id", scheduleId)
        .eq("user_id", user.id)
        .single();

    if (participantError && participantError.code !== "PGRST116") {
        throw new Error(`Error fetching participant: ${participantError.message}`);
    }

    // If not a participant, join them
    if (!participant) {
        const { data: newParticipant, error: joinError } = await supabase
            .from("participants")
            .insert({
                schedule_id: scheduleId,
                user_id: user.id,
                role: "guest",
            })
            .select("id")
            .single();

        if (joinError) {
            throw new Error(`Error joining schedule: ${joinError.message}`);
        }
        participant = newParticipant;
    }

    if (!participant) {
        throw new Error("Failed to identify participant.");
    }

    // 2. Convert availabilities to DB format
    const slotsToInsert = [];

    for (const key of Object.keys(availabilities)) {
        const [dayIdxStr, timeIdxStr] = key.split("-");
        const dayIdx = parseInt(dayIdxStr);
        const timeIdx = parseInt(timeIdxStr);

        const slotDate = addDays(startDate, dayIdx);
        const slotStart = addMinutes(startOfDay(slotDate), timeIdx * 30);
        const slotEnd = addMinutes(slotStart, 30);

        slotsToInsert.push({
            participant_id: participant.id,
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
        });
    }

    // 3. Save to Supabase
    // Delete existing
    const { error: deleteError } = await supabase
        .from("availabilities")
        .delete()
        .eq("participant_id", participant.id);

    if (deleteError) {
        throw new Error(`Error clearing old availability: ${deleteError.message}`);
    }

    // Insert new
    if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from("availabilities")
            .insert(slotsToInsert);

        if (insertError) {
            throw new Error(`Error saving availability: ${insertError.message}`);
        }
    }

    return true;
}
