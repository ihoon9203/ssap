export interface User {
    id: string;
    updated_at?: string;
    username: string;
    real_name: string;
    avatar_url?: string;
    nickname?: string;
    schedules?: string[]; // Array of UUIDs
}

export interface Schedule {
    id: string;
    created_at: string;
    creator_id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    invite_code?: string;
    status: 'pending' | 'confirmed' | 'aborted' | string;
    confirmed_start_time?: string;
    confirmed_end_time?: string;
    participants_id?: string[]; // Array of UUIDs
    availabilities_id?: string[]; // Array of UUIDs
    dates?: string[]; // Array of strings (YYYY-MM-DD)
    available_time?: string[]; // Array of strings (YYYYMMDD-HH:mm) representing the valid slots defined by creator
}

export interface Participant {
    id: string;
    created_at: string;
    schedule_id: string;
    user_id: string;
    role?: string;
    available_range?: string[]; // text[] in DB
}

export interface Availability {
    id: string;
    participants_id: string;
    schedule_id: string; // Added field
    selected_times: string[];
}

// Extended types for UI usage if needed
export interface ScheduleWithDetails extends Schedule {
    participant_count?: number;
}
