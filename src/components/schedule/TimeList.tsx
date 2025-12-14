"use client";

import { format, addMinutes, startOfDay } from "date-fns";
import { Star, Users } from "lucide-react";

interface TimeListProps {
    startDate: Date;
    totalParticipants: number;
    availabilities: { [key: string]: number };
    selectedAvailabilities: Set<string>,
    onScheduleSelect: (schedule: string[]) => void
}

export function TimeList({
    startDate,
    totalParticipants,
    availabilities,
    selectedAvailabilities,
    onScheduleSelect
}: TimeListProps) {
    // Logic to find best times (consecutive slots with high availability)
    // For now, just find top 3 single slots or simple ranges

    const getRankedGroups = () => {
        // 1. Convert to array
        const slots = [];
        for (const [key, count] of Object.entries(availabilities)) {
            if (count > 0) {
                const [dayIdx, timeIdx] = key.split("-").map(Number);
                slots.push({ dayIdx, timeIdx, count });
            }
        }

        // 2. Sort by Date -> Time
        slots.sort((a, b) => {
            if (a.dayIdx !== b.dayIdx) return a.dayIdx - b.dayIdx;
            return a.timeIdx - b.timeIdx;
        });

        // 3. Group consecutive slots
        const groups: { dayIdx: number; startTimeIdx: number; endTimeIdx: number; count: number }[] = [];

        slots.forEach((slot) => {
            const lastGroup = groups[groups.length - 1];

            // Checks if consecutive: same day, same count, adjacent time slot
            if (lastGroup &&
                lastGroup.dayIdx === slot.dayIdx &&
                lastGroup.count === slot.count &&
                lastGroup.endTimeIdx + 1 === slot.timeIdx) {

                lastGroup.endTimeIdx = slot.timeIdx;
            } else {
                groups.push({
                    dayIdx: slot.dayIdx,
                    startTimeIdx: slot.timeIdx,
                    endTimeIdx: slot.timeIdx,
                    count: slot.count
                });
            }
        });

        // 4. Sort Groups: Highest Availability First, then Longest Duration, then Earliest
        return groups.sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count; // Higher count first

            const durationA = a.endTimeIdx - a.startTimeIdx;
            const durationB = b.endTimeIdx - b.startTimeIdx;
            if (durationB !== durationA) return durationB - durationA; // Longer duration first

            if (a.dayIdx !== b.dayIdx) return a.dayIdx - b.dayIdx;
            return a.startTimeIdx - b.startTimeIdx;
        }).slice(0, 5);
    };

    const rankedGroups = getRankedGroups();

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                시간대 추천 리스트
            </h3>

            <div className="space-y-3">
                {rankedGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No availability data yet.</p>
                ) : (
                    rankedGroups.map((group, i) => {
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + group.dayIdx);

                        const startTime = addMinutes(startOfDay(date), group.startTimeIdx * 30);
                        const endTime = addMinutes(startOfDay(date), (group.endTimeIdx + 1) * 30); // End of the slot

                        const isFull = group.count === totalParticipants;
                        const durationMinutes = (group.endTimeIdx - group.startTimeIdx + 1) * 30;

                        // Format duration
                        const durationText = durationMinutes >= 60
                            ? `${durationMinutes / 60} hr${durationMinutes > 60 ? 's' : ''}`
                            : `${durationMinutes} min`;

                        // Generate all keys in this group to check selection
                        const groupKeys: string[] = [];
                        const dateStr = format(date, "yyyyMMdd");

                        for (let t = group.startTimeIdx; t <= group.endTimeIdx; t++) {
                            groupKeys.push(`${dateStr}-${t}`);
                        }
                        console.log('groupKeys', groupKeys);

                        // Check if this group is currently selected
                        // (Multi-select support: check if all keys in this group are present in selectedAvailabilities)
                        const isSelected = groupKeys.length > 0 && groupKeys.every(k => selectedAvailabilities.has(k));

                        return (
                            <div
                                key={i}
                                onClick={() => onScheduleSelect(groupKeys)}
                                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all ${isSelected
                                    ? "bg-primary/10 border-primary shadow-sm"
                                    : "hover:bg-muted/50"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold ${isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                        }`}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {format(date, "MMM d")} • {format(startTime, "HH:mm")} ~ {format(endTime, "HH:mm")}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {durationText} duration
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className={isFull ? "font-bold text-blue-600" : "font-medium"}>
                                        {group.count + 1}/{totalParticipants}
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
