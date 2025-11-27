"use client";

import { format, eachDayOfInterval, addMinutes, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface HeatmapViewProps {
    startDate: Date;
    endDate: Date;
    totalParticipants: number;
    availabilities: { [key: string]: number }; // key: "dayIdx-timeIdx", value: count
}

export function HeatmapView({
    startDate,
    endDate,
    totalParticipants,
    availabilities,
}: HeatmapViewProps) {
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Generate 30-min intervals for 24 hours (48 slots)
    const timeSlots = Array.from({ length: 48 }, (_, i) => {
        const date = addMinutes(startOfDay(new Date()), i * 30);
        return format(date, "HH:mm");
    });

    const getSlotColor = (count: number) => {
        if (count === 0) return "bg-muted/30";
        if (count === totalParticipants) return "bg-blue-500 text-white"; // Distinct color for all available

        // Calculate lightness/opacity based on count (0 to n-1)
        // We want higher count = darker green
        // Scale: 1 to n-1
        const maxScale = Math.max(1, totalParticipants - 1);
        const intensity = count / maxScale;

        // Using opacity for simplicity with a base green color
        // Or we can use specific shades. Let's use opacity on a green base.
        // Minimum opacity 0.2 for 1 person
        const opacity = 0.2 + (intensity * 0.8);

        return `bg-green-500/${Math.round(opacity * 100)}`;
    };

    return (
        <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
                <div className="min-w-[1200px] p-6">
                    {/* Header Row (Times) */}
                    <div className="mb-4 flex">
                        <div className="w-32 flex-shrink-0" />
                        <div className="flex flex-1 justify-between text-xs text-muted-foreground">
                            {timeSlots.filter((_, i) => i % 2 === 0).map((time) => (
                                <div key={time} className="w-8 text-center">{time}</div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-2">
                        {days.map((day, dayIdx) => (
                            <div key={day.toString()} className="flex items-center gap-4">
                                {/* Date Label */}
                                <div className="w-28 flex-shrink-0 text-sm font-medium">
                                    {format(day, "EEE, MMM d")}
                                </div>

                                {/* Heatmap Grid */}
                                <div className="flex flex-1 gap-[2px]">
                                    {timeSlots.map((_, timeIdx) => {
                                        const count = availabilities[`${dayIdx}-${timeIdx}`] || 0;
                                        const isFull = count === totalParticipants;

                                        return (
                                            <div
                                                key={timeIdx}
                                                className={cn(
                                                    "h-10 flex-1 rounded-sm transition-all hover:ring-2 hover:ring-ring hover:z-10",
                                                    getSlotColor(count),
                                                    isFull && "shadow-md ring-1 ring-blue-600",
                                                    // Add borders for hour markers
                                                    timeIdx % 2 === 1 && "mr-[1px] border-r border-border/50"
                                                )}
                                                title={`${count}/${totalParticipants} available`}
                                            >
                                                {/* Optional: Show count on hover or always if space permits */}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t bg-muted/20 p-4">
                <div className="flex items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-muted/30 border" />
                        <span>0/{totalParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-green-500/30" />
                        <span>1/{totalParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-green-500" />
                        <span>{totalParticipants - 1}/{totalParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded bg-blue-500 shadow-sm" />
                        <span className="font-medium text-blue-600 dark:text-blue-400">All Available</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
