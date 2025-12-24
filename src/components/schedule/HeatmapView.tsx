"use client";

import { format, eachDayOfInterval, addMinutes, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useLayoutEffect, useMemo, useEffect } from "react";

interface HeatmapViewProps {
    startDate: Date;
    endDate: Date;
    creatorAvailableTimes: string[];
    totalParticipants: number;
    availabilities: { [key: string]: number }; // key: "dayIdx-timeIdx", value: count
    onSelect?: (slots: string[]) => void;
    selectedSlots?: Set<string>;
    isInteractive?: boolean;
}

export function HeatmapView({
    startDate,
    endDate,
    creatorAvailableTimes = [],
    totalParticipants,
    availabilities,
    onSelect,
    selectedSlots = new Set(),
    isInteractive = false,
}: HeatmapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ dayIdx: number; timeIdx: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ dayIdx: number; timeIdx: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(true);
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Generate 30-min intervals for 24 hours (48 slots)
    const timeSlots = useMemo(() => Array.from({ length: 48 }, (_, i) => {
        const date = addMinutes(startOfDay(new Date()), i * 30);
        return format(date, "HH:mm");
    }), []);

    const getSelectionBox = useCallback(() => {
        if (!dragStart || !dragCurrent) return null;

        const minDay = Math.min(dragStart.dayIdx, dragCurrent.dayIdx);
        const maxDay = Math.max(dragStart.dayIdx, dragCurrent.dayIdx);
        const minTime = Math.min(dragStart.timeIdx, dragCurrent.timeIdx);
        const maxTime = Math.max(dragStart.timeIdx, dragCurrent.timeIdx);

        return { minDay, maxDay, minTime, maxTime };
    }, [dragStart, dragCurrent]);

    // Calculate overlay position
    useLayoutEffect(() => {
        if (!isDragging || !dragStart || !dragCurrent || !containerRef.current) {
            setOverlayStyle(null);
            return;
        }

        const box = getSelectionBox();
        if (!box) return;

        // Find start and end elements
        const startEl = containerRef.current.querySelector(
            `[data-day="${box.minDay}"][data-time="${box.minTime}"]`
        ) as HTMLElement;
        const endEl = containerRef.current.querySelector(
            `[data-day="${box.maxDay}"][data-time="${box.maxTime}"]`
        ) as HTMLElement;

        if (startEl && endEl) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const startRect = startEl.getBoundingClientRect();
            const endRect = endEl.getBoundingClientRect();

            const top = startRect.top - containerRect.top + containerRef.current.scrollTop;
            const left = startRect.left - containerRect.left + containerRef.current.scrollLeft;
            const width = endRect.right - startRect.left;
            const height = endRect.bottom - startRect.top;

            setOverlayStyle({
                top,
                left,
                width,
                height,
            });
        }
    }, [isDragging, dragStart, dragCurrent, getSelectionBox]);

    const handleMouseDown = useCallback((dayIdx: number, timeIdx: number) => {
        if (!isInteractive) return;

        const date = days[dayIdx];
        const key = `${format(date, "yyyyMMdd")}-${timeIdx}`;

        setIsDragging(true);
        setDragStart({ dayIdx, timeIdx });
        setDragCurrent({ dayIdx, timeIdx });

        // If the start cell is already selected, we are deselecting.
        setIsSelecting(!selectedSlots.has(key));
    }, [isInteractive, days, selectedSlots]);

    const handleMouseEnter = useCallback((dayIdx: number, timeIdx: number) => {
        if (!isDragging) return;
        setDragCurrent({ dayIdx, timeIdx });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        if (!isDragging || !dragStart || !dragCurrent) {
            setIsDragging(false);
            setDragStart(null);
            setDragCurrent(null);
            setOverlayStyle(null);
            return;
        }

        const box = getSelectionBox();
        if (box && onSelect) {
            // Collect all unique keys in the box
            const keysInBox: string[] = [];
            for (let d = box.minDay; d <= box.maxDay; d++) {
                const date = days[d];
                const dateStr = format(date, "yyyyMMdd");
                for (let t = box.minTime; t <= box.maxTime; t++) {
                    keysInBox.push(`${dateStr}-${t}`);
                }
            }

            // If drag area is valid, we use the isSelecting flag determined at drag start
            // But since onSelect handles logic externally usually, we can just pass the "keys involved"
            // and let the parent decide, OR we can follow the consistent logic here.

            // To be consistent with TimeTable, we should calculate the new set and pass it?
            // Or just pass the keys that were interacted with. 
            // Given `onSelect(slots: string[])` signature in plan says "updates selectedAvailabilities".
            // Let's pass the keys and let parent toggle them, OR handle the toggle logic here if we pass the full new set.
            // The plan said "updates selectedAvailabilities. Merges with existing selection (or toggles)."
            // Let's pass the affected keys and let the parent handle the merge/toggle logic to keep this component simpler 
            // regarding "what was previous state of specific cells".

            // However, `isSelecting` state we captured tells us the INTENT of the drag.
            // If we started on an unselected cell, we want to select ALL these cells.
            // If we started on a selected cell, we want to deselect ALL these cells.
            // But the parent `handleScheduleSelect` logic (from TimeList) toggles based on "if all selected then deselect".

            // Let's just pass the keys. The parent `handleScheduleSelect` currently does:
            // "Check if all keys in the new group are already selected... If so, deselect... Else select all."
            // This matches exactly what we want if we drag over a range.
            onSelect(keysInBox);
        }

        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        setOverlayStyle(null);
    }, [isDragging, dragStart, dragCurrent, getSelectionBox, onSelect, days]);

    useEffect(() => {
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [handleMouseUp]);


    const getSlotStyle = (count: number, isCreatorAvailable: boolean) => {
        if (count === 0) {
            if (isCreatorAvailable) {
                // Available but not selected: Darker gray
                return { className: "bg-gray-400" };
            }
            // Not available at all: Lighter gray but visible
            return { className: "bg-secondary" };
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
        <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm select-none">
            <div className="overflow-x-auto relative" ref={containerRef}>
                <div className="min-w-[1200px] p-6 relative">
                    {/* Overlay */}
                    {overlayStyle && (
                        <div
                            className="absolute z-20 rounded-md border border-blue-500 bg-blue-500/30 pointer-events-none transition-all duration-75"
                            style={overlayStyle}
                        />
                    )}

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

                                        // Check creator availability
                                        const searchKey = `${format(day, "yyyyMMdd")}-${timeIdx}`;
                                        const isCreatorAvailable = creatorAvailableTimes.includes(searchKey);
                                        const isSelected = selectedSlots.has(searchKey);

                                        // Rule: If Interactive, Unselected cells are always 50% opacity.
                                        // (This covers "no selection = all 50%" and "selection exists = unselected 50%")
                                        const isDimmed = isInteractive && !isSelected;

                                        let { className, style } = getSlotStyle(count, isCreatorAvailable);

                                        // Rule 3: If selected and originally white (count 0), fill with black
                                        if (isSelected && count === 0) {
                                            className = "!bg-gray-500 !opacity-100";
                                            style = undefined;
                                        }

                                        return (
                                            <div
                                                key={timeIdx}
                                                data-day={dayIdx}
                                                data-time={timeIdx}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleMouseDown(dayIdx, timeIdx);
                                                }}
                                                onMouseEnter={() => handleMouseEnter(dayIdx, timeIdx)}
                                                className={cn(
                                                    "h-10 flex-1 rounded-sm transition-all relative overflow-hidden border border-border/30",
                                                    isInteractive ? "cursor-pointer" : "cursor-default",
                                                    className,
                                                    // Add borders for hour markers (stronger)
                                                    timeIdx % 2 === 1 && "mr-[1px] !border-r-border/60",
                                                    // Opacity Rule
                                                    isDimmed && "opacity-50 grayscale-[20%]"
                                                )}
                                                style={style}
                                                title={`${count}/${totalParticipants} available${!isCreatorAvailable ? ' (Closed)' : ''}`}
                                            >
                                                {/* No overlay needed, rely on Opacity and Color change */}
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
                    {/* Legend Items */}
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
                    {isInteractive && (
                        <div className="ml-4 flex items-center gap-2 text-primary font-medium border-l pl-4">
                            <div className="h-4 w-4 rounded bg-gray-500" />
                            <span>Selected</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
