"use client";

import { createClient } from "@/lib/supabase/client";
import { generateRandomCode } from "@/lib/utils";
import { Availability, Schedule } from "@/models/types";
import { createContext, useContext, useEffect, useState } from "react";

interface ScheduleContextType {
    schedule: Schedule | null;
    isLoading: boolean;
    refreshSchedule: () => Promise<void>;
    currentScheduleId: string | null;
    setCurrentScheduleId: (id: string | null) => void;
}

export interface UserData {
    id: string;
    updated_at: string;
    username: string;
    real_name: string;
    avatar_url: string;
    nickname: string;
    schdules: string;
}

export interface ScheduleData {
    schedule: Schedule;
    creator: UserData;
    participants: UserData[]; // 이미 [User] 배열로 요청하셨으므로
}

const ScheduleContext = createContext<ScheduleContextType>({
    schedule: null,
    isLoading: true,
    refreshSchedule: async () => { },
    currentScheduleId: null,
    setCurrentScheduleId: () => { },
});

export function ScheduleProvider({
    children,
    initialSchedule,
}: {
    children: React.ReactNode;
    initialSchedule?: Schedule | null;
}) {
    const [schedule, setSchedule] = useState<Schedule | null>(initialSchedule || null);
    const [isLoading, setIsLoading] = useState(!initialSchedule);
    const [currentScheduleId, setCurrentScheduleIdState] = useState<string | null>(null);
    const supabase = createClient();

    const setCurrentScheduleId = (id: string | null) => {
        setCurrentScheduleIdState(id);
        if (id) {
            sessionStorage.setItem("currentScheduleId", id);
        } else {
            sessionStorage.removeItem("currentScheduleId");
        }
    };

    useEffect(() => {
        // Recover from session storage
        const savedId = sessionStorage.getItem("currentScheduleId");
        if (savedId) {
            setCurrentScheduleIdState(savedId);
        }
    }, []);

    const refreshSchedule = async () => {
        // NOTE: The select query below assumes 'schedule' is a column returned in the object
        // If it's the whole row, the destructuring might need adjustment.
        const { data: { schedule: currentSchedule } } = await supabase.from("schedules").select("*").single();
        if (currentSchedule) {
            setSchedule(currentSchedule);
        }
    };

    useEffect(() => {
        // Initial fetch logic remains the same
        const init = async () => {
            const { data: { schedule: currentSchedule } } = await supabase.from("schedules").select("*").single();
            if (currentSchedule) {
                setSchedule(currentSchedule);
            } else {
                setIsLoading(false);
            }
        };
        init();

        // --- 🎯 REAL-TIME SUBSCRIPTION FIX ---
        // 1. Create a channel
        const channel = supabase.channel('schedule-updates');

        // 2. Attach the listener to the channel and subscribe
        const subscription = channel
            .on(
                'postgres_changes', // The type of listener for database changes
                { event: '*', schema: 'public', table: 'schedules' }, // Specify table and event
                async (payload) => {
                    console.log('Change received!', payload);
                    await refreshSchedule(); // Refresh data when a change occurs
                }
            )
            .subscribe();

        // Set loading state once the subscription is established/attempted
        setIsLoading(false);

        // Clean-up function to unsubscribe when the component unmounts
        return () => {
            // Check if the subscription object exists before trying to unsubscribe
            if (subscription) {
                supabase.removeChannel(channel);
            }
        };
        // Dependency array: Only re-run if 'supabase' object changes (unlikely) or 'refreshSchedule' changes (if not memoized)
    }, [supabase, refreshSchedule]); // Added refreshSchedule as a dependency, wrap in useCallback if needed.

    return (
        <ScheduleContext.Provider value={{ schedule, isLoading, refreshSchedule, currentScheduleId, setCurrentScheduleId }}>
            {children}
        </ScheduleContext.Provider>
    );
}

export const getCreatedScheduleList = async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("creator_id", userId);
    if (error) {
        console.error("Error fetching schedules1:", error);
        return [];
    }
    return data;
}

export const getJoinedScheduleList = async (userId: string, idsToIgnore: string[]) => {
    const supabase = createClient();
    let query = supabase
        .from("schedules")
        .select("*")
        .contains("participants_id", [userId]);

    if (idsToIgnore.length > 0) {
        // Supabase PostgREST filter for 'not.in' expects a tuple string like "(id1,id2)"
        // The .not() helper sometimes fails to format array arguments correctly for UUIDs
        query = query.filter("id", "not.in", `(${idsToIgnore.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching schedules2:", error);
        return [];
    }
    return data;
}

export const updateSchedule = async (scheduleId: string, updates: Partial<Schedule>) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("schedules")
        .update(updates)
        .eq("id", scheduleId)
        .select()
        .single();

    if (error) {
        console.error("Error updating schedule:", error);
        throw error;
    }
    return data;
};

export const updateScheduleName = async (scheduleId: string, newName: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("schedules")
        .update({ name: newName }) // Object with columns to update
        .eq("id", scheduleId)      // Filter to select the row to update
        .select()
        .single();

    if (error) {
        console.error("Error updating schedule:", error);
        return null;
    }
    // The real-time listener will trigger refreshSchedule automatically!
    return data;
};

export const createNewSchedule = async (title: string, description: string, dates: Date[], availability: string[]) => {
    console.log("Starting createNewSchedule...");
    const supabase = createClient();

    // 1. Get User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("User auth error:", authError);
        alert("Authentication failed. Please log in again.");
        return null;
    }
    console.log("User authenticated:", user.id);

    // while exist same code in the table recursively create new code
    var isUnique = false;
    var roomCode = "";
    while (!isUnique) {
        roomCode = generateRandomCode();
        const schedule = await searchSchedule(roomCode);
        if (!schedule) {
            isUnique = true;
        }
    }
    const payload = {
        title,
        description,
        dates: dates, // Send as strings
        available_time: availability,
        creator_id: user.id,
        created_at: new Date().toISOString(),
        invite_code: roomCode,
        participants_id: [user.id],
        status: 'pending'
    };

    console.log("Sending payload to Supabase:", payload);

    // 3. Execute Insert
    const { data, error } = await supabase
        .from("schedules")
        .insert(payload)
        .select()
        .single();

    console.log("Supabase response:", { data, error });

    if (error) {
        console.error("Error creating schedule:", error);
        alert(`Failed to create schedule!\nError: ${error.message}\nHint: Check console for full details.`);
        return null;
    }

    return data;
};

export const readSchedule = async (scheduleId: string) => {
    const supabase = createClient();
    const { data: schedule, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("id", scheduleId) // Filter by ID
        .single();          // Expect a single result

    if (error) {
        console.error("Error reading schedule:", error);
        return null;
    }
    return schedule;
};

export const saveAvailability = async (
    scheduleId: string,
    userId: string,
    selectedTimes: string[],
    availabilityId?: string
) => {
    const supabase = createClient();

    console.log("Saving availability for user:", userId);

    if (availabilityId) {
        // Update existing availability
        const { data, error } = await supabase
            .from("availabilities")
            .update({ selected_times: selectedTimes })
            .eq("id", availabilityId)
            .select()
            .single();

        if (error) {
            console.error("Error updating availability:", error);
            throw error;
        }
        return data;
    } else {
        // Insert new availability
        const { data, error } = await supabase
            .from("availabilities")
            .insert({
                schedule_id: scheduleId,
                user_id: userId,
                selected_times: selectedTimes
            })
            .select()
            .single();

        if (error) {
            console.error("Error saving availability:", error);
            throw error;
        }
        return data;
    }

};

export const getRelatedAvailabilities = async (scheduleId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("availabilities")
        .select("*")
        .eq("schedule_id", scheduleId);
    if (error) {
        console.error("Error getting related availabilities:", error);
        return [];
    }
    return data;
};

export const useSchedule = () => {
    const context = useContext(ScheduleContext);
    if (context === undefined) {
        throw new Error("useSchedule must be used within a ScheduleProvider");
    }
    return context;
};

export const searchSchedule = async (code: string) => {
    const supabase = createClient();
    console.log("Searching schedule with code:", code);
    const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("invite_code", code)
        .maybeSingle();
    console.log("Search result:", data);
    if (error) {
        console.error("Error searching schedule:", error);
        return null;
    }
    return data;
};

export const joinSchedule = async (scheduleId: string, userId: string) => {
    const supabase = createClient();
    console.log("Joining schedule via RPC:", scheduleId, userId);

    const { data, error } = await supabase
        .rpc('join_schedule', { schedule_id: scheduleId, user_id: userId });

    if (error) {
        console.error("Error joining schedule:", error);
        throw error;
    }

    console.log("RPC result:", data);
    return data;
};

export const setScheduleStatus = async (scheduleId: string, newStatus: string) => {
    const supabase = createClient();
    console.log("Confirming schedule via RPC:", scheduleId);

    const { data, error } = await supabase
        .rpc('set_status', { schedule_id: scheduleId, new_status: newStatus });

    console.log("RPC result:", data);
    return { data, error };
}

export const confirmSchedule = async (scheduleId: string, schedule_list: string[]) => {
    const supabase = createClient();
    console.log("Confirming schedule via RPC:", scheduleId);

    const { data, error } = await supabase
        .rpc('confirm_schedule_times', { schedule_id_input: scheduleId, confirmed_schedule_list: schedule_list });

    console.log("RPC result:", data);
    return { data, error };
}

export const readScheduleWithRpc = async (scheduleId: string): Promise<ScheduleData | null> => {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
        "get_schedule_with_users", // 1단계에서 정의한 함수 이름
        { schedule_id: scheduleId } // 함수에 전달할 인자
    ).single(); // 단일 결과를 기대
    console.log(data);

    if (error) {
        console.error("Error calling get_schedule_with_users:", error);
        return null;
    }

    // 결과는 { schedule: {...}, creator: {...}, participants: [...] } 형식입니다.
    // 하지만, rpc의 결과는 JSONB로 반환되므로 타입스크립트에서 사용 시 타입 변환이 필요할 수 있습니다.
    // data는 ScheduleData 타입의 객체가 됩니다.
    return data as ScheduleData;
};