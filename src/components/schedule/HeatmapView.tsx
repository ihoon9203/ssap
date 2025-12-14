"use client";

import { format, eachDayOfInterval, addMinutes, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface HeatmapViewProps {
    startDate: Date;
    endDate: Date;
    creatorAvailableTimes: string[];
    totalParticipants: number;
    availabilities: { [key: string]: number }; // key: "dayIdx-timeIdx", value: count
}

export function HeatmapView({
    startDate,
    endDate,
    creatorAvailableTimes = [],
    totalParticipants,
    availabilities,
}: HeatmapViewProps) {
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Generate 30-min intervals for 24 hours (48 slots)
    const timeSlots = Array.from({ length: 48 }, (_, i) => {
        const date = addMinutes(startOfDay(new Date()), i * 30);
        return format(date, "HH:mm");
    });
    console.log("availabilities", availabilities);

    const getSlotStyle = (count: number, isCreatorAvailable: boolean) => {
        if (count === 0) {
            if (isCreatorAvailable) {
                // Available but not selected: Darker gray
                return { className: "bg-gray-400" };
            }
            // Not available at all: Lighter gray
            return { className: "bg-muted/20" };
        }
        if (count === totalParticipants) return { className: "bg-blue-500 text-white" };

        // For counts between 1 and n-1
        // Interpolate between Yellow (approx Hue 45) and Green (approx Hue 120)
        // We want 1 -> Yellow, (n-1) -> Green

        let hue = 120; // Default green
        if (totalParticipants > 2) {
            const minCount = 1;
            const maxCount = totalParticipants - 1;

            // Normalize count to 0..1 range
            // t = 0 when count == 1
            // t = 1 when count == maxCount
            const t = (count - minCount) / (maxCount - minCount);

            // Yellow (45) -> Green (130)
            hue = 45 + Math.round(t * (130 - 45));
        } else {
            // If only 1 participants (1/2 is the only partial state), make it bg-blue-500
            hue = 215;
        }

        return {
            className: "",
            style: { backgroundColor: `hsla(${hue}, 90%, 55%, 1)` }
        };
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

                                        // Check creator availability
                                        const searchKey = `${format(day, "yyyyMMdd")}-${timeIdx}`;
                                        const isCreatorAvailable = creatorAvailableTimes.includes(searchKey);

                                        const { className, style } = getSlotStyle(count, isCreatorAvailable);

                                        return (
                                            <div
                                                key={timeIdx}
                                                className={cn(
                                                    "h-10 flex-1 rounded-sm transition-all hover:ring-2 hover:ring-ring hover:z-10",
                                                    className,
                                                    // isFull && "shadow-md ring-1 ring-blue-600",
                                                    // Add borders for hour markers
                                                    timeIdx % 2 === 1 && "mr-[1px] border-r",
                                                    timeIdx % 2 === 1 && (count > 0 ? "border-border/50" : "border-transparent")
                                                )}
                                                style={style}
                                                title={`${count}/${totalParticipants} available${!isCreatorAvailable ? ' (Closed)' : ''}`}
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
                        <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsla(45, 90%, 55%, 1)' }} />
                        <span>1/{totalParticipants} (Low)</span>
                    </div>
                    {totalParticipants > 2 && (
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-[hsl(45,90%,55%)] to-[hsl(130,90%,55%)]" />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded" style={{ backgroundColor: 'hsla(130, 90%, 55%, 1)' }} />
                        <span>{Math.max(1, totalParticipants - 1)}/{totalParticipants} (High)</span>
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
