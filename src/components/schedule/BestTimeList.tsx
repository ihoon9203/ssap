"use client";

import { format, addMinutes, startOfDay } from "date-fns";
import { Star, Users } from "lucide-react";

interface BestTimeListProps {
    startDate: Date;
    totalParticipants: number;
    availabilities: { [key: string]: number };
}

export function BestTimeList({
    startDate,
    totalParticipants,
    availabilities,
}: BestTimeListProps) {
    // Logic to find best times (consecutive slots with high availability)
    // For now, just find top 3 single slots or simple ranges

    const getRankedTimes = () => {
        const slots = [];
        for (const [key, count] of Object.entries(availabilities)) {
            if (count > 0) {
                const [dayIdx, timeIdx] = key.split("-").map(Number);
                slots.push({ dayIdx, timeIdx, count });
            }
        }

        // Sort by count (desc), then by time
        return slots.sort((a, b) => b.count - a.count).slice(0, 5);
    };

    const rankedTimes = getRankedTimes();

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Best Times
            </h3>

            <div className="space-y-3">
                {rankedTimes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No availability data yet.</p>
                ) : (
                    rankedTimes.map((slot, i) => {
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + slot.dayIdx);
                        const time = addMinutes(startOfDay(date), slot.timeIdx * 30);
                        const isFull = slot.count === totalParticipants;

                        return (
                            <div key={i} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-mono text-sm font-bold">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {format(date, "MMM d")} • {format(time, "HH:mm")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            30 min duration
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className={isFull ? "font-bold text-blue-600" : "font-medium"}>
                                        {slot.count}/{totalParticipants}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
