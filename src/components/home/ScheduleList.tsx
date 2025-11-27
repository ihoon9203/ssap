"use client";

import { Calendar, Clock, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Mock data type
type Schedule = {
    id: string;
    title: string;
    status: "pending" | "confirmed";
    start_date: string;
    end_date: string;
    participant_count: number;
};

export function ScheduleList({ schedules }: { schedules: Schedule[] }) {
    if (schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No schedules yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Create a new schedule or join one with an invite code.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {schedules.map((schedule, i) => (
                <div
                    key={schedule.id}
                    className="group relative flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:shadow-md animate-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${i * 100}ms` }}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full",
                                schedule.status === "confirmed"
                                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            )}
                        >
                            {schedule.status === "confirmed" ? (
                                <Clock className="h-6 w-6" />
                            ) : (
                                <Calendar className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold">{schedule.title}</h3>
                            <p className="text-sm text-muted-foreground">
                                {format(new Date(schedule.start_date), "MMM d")} -{" "}
                                {format(new Date(schedule.end_date), "MMM d, yyyy")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <div className="text-sm font-medium">
                                {schedule.participant_count} Participants
                            </div>
                            <div className={cn(
                                "text-xs capitalize",
                                schedule.status === "confirmed" ? "text-green-600" : "text-orange-600"
                            )}>
                                {schedule.status}
                            </div>
                        </div>
                        <button className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
