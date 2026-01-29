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

const HEATMAP_COLORS = [
    '#6B7280',
    '#72757A',
    '#797775',
    '#817A6F',
    '#887D69',
    '#8F7F64',
    '#96825E',
    '#9D8559',
    '#A58753',
    '#AC8A4D',
    '#B38D48',
    '#BA9042',
    '#C2923C',
    '#C99537',
    '#D09831',
    '#D79A2C',
    '#DE9D26',
    '#E6A020',
    '#F4A515',
    '#3B82F6'
];

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


    const HEATMAP_COLORS = [
        '#FFF176', '#FFEA70', '#FFE46A', '#FFDE64', '#FFD75D',
        '#FFD157', '#FFCB51', '#FFC54B', '#FFBE45', '#FFB83F',
        '#FFB239', '#FFAB33', '#FFA52D', '#FF9F26', '#FF9820',
        '#FF921A', '#FF8C14', '#FF850E', '#FF7F08', '#FF7902'
    ];

    const getSlotStyle = (count: number, isCreatorAvailable: boolean) => {
        if (count === 0) {
            // 0 participants -> Gray (bg-secondary or specific gray).
            // Retain distinction if creator is available? Plan says "0 participants -> Gray".
            // Previous code:
            // if (isCreatorAvailable) return { className: "bg-gray-400" };
            // return { className: "bg-secondary" };

            // Let's keep the distinction for now as it aids the creator, but plan says "0 participants -> Gray".
            // If I strictly follow plan:
            return { className: "bg-secondary" };
        }

        if (count === totalParticipants) {
            // Max participants -> Blue.
            return { className: "bg-blue-500 text-white" };
        }

        // Intermediate counts -> Pick color from designated palette
        // Formula: index = round( (k-1) / (n-1) * j )
        // k = HEATMAP_COLORS.length
        // n = totalParticipants - 1 (number of intermediate steps? No, max participant is totalParticipants)
        // actually n in the plan description: "n = totalParticipants - 1 (number of intermediate steps)"
        // j = current_count - 1 (0-indexed step)

        // Wait, if totalParticipants is 5.
        // Counts can be 1, 2, 3, 4, 5.
        // 5 is Max -> Blue.
        // 0 is Gray.
        // Intermediates are 1, 2, 3, 4.
        // "j = current_count - 1".
        // If count = 1, j=0.
        // If count = 4, j=3.
        // "n = totalParticipants - 1".
        // If totalParticipants = 5, n=4.

        // Let's re-read carefully: "Let n = totalParticipants - 1 (number of intermediate steps)"
        // If totalParticipants = 5. Intermediates are 1, 2, 3, 4. That is 4 steps. So n=4. Correct.

        // "index = round( (k-1) / (n-1) * j )"
        // k=5 (colors). k-1 = 4.
        // n=4.
        // factor = 4/4 = 1.
        // j ranges 0..3.
        // index ranges 0..3.
        // Perfect mapping.

        // Edge case: totalParticipants <= 1
        // If totalParticipants = 1. 
        // Counts: 0 (Gray), 1 (Max -> Blue).
        // No intermediates. This logic block won't be reached if count === totalParticipants.

        // What if count < totalParticipants? (e.g. 1/2).

        const k = HEATMAP_COLORS.length;
        const n = totalParticipants - 1;
        const j = count - 1;

        if (n <= 0) {
            // Should verify logic doesn't divide by zero or act weird if only 1 participant total?
            // If totalParticipants=1, then count can only be 1 (handled by Max check) or 0 (handled by 0 check).
            // If data is somehow count > totalParticipants? Fallback to Max.
            return { className: "bg-blue-500 text-white" };
        }

        const index = Math.round(((k - 1) / n) * j);
        // Clamp index just in case
        const safeIndex = Math.max(0, Math.min(k - 1, index));

        return {
            className: "",
            style: { backgroundColor: HEATMAP_COLORS[safeIndex] }
        };
    };

    return (
        <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm select-none">
            <div className="overflow-x-auto relative" ref={containerRef}>
                <div className="min-w-[1200px] px-10 py-6 relative">
                    {/* Overlay */}
                    {overlayStyle && (
                        <div
                            className="absolute z-20 rounded-md border border-blue-500 bg-blue-500/30 pointer-events-none transition-all duration-75"
                            style={overlayStyle}
                        />
                    )}

                    {/* Rows */}
                    <div className="space-y-2">
                        {days.map((day, dayIdx) => (
                            <div key={day.toString()} className="flex items-center gap-2">
                                {/* Date Label */}
                                <div className="w-28 flex-shrink-0 text-sm font-medium">
                                    {format(day, "EEE, MMM d")}
                                </div>

                                {/* Heatmap Grid */}
                                <div className="flex flex-2 gap-[2px]">
                                    {timeSlots.map((timeLabel, timeIdx) => {
                                        const count = availabilities[`${dayIdx}-${timeIdx}`] || 0;

                                        // Check creator availability
                                        const searchKey = `${format(day, "yyyyMMdd")}-${timeIdx}`;
                                        const isCreatorAvailable = creatorAvailableTimes.includes(searchKey);
                                        const isSelected = selectedSlots.has(searchKey);

                                        // Rule: If Interactive, Unselected cells are always 50% opacity.
                                        // (This covers "no selection = all 50%" and "selection exists = unselected 50%")
                                        const isDimmed = isInteractive && !isSelected;

                                        let { className, style } = getSlotStyle(count, isCreatorAvailable);

                                        // Rule 4: Selected slots -> Dark Blue
                                        if (isSelected) {
                                            className = "bg-blue-700 text-white";
                                            style = undefined;
                                        }

                                        // Determine text color for readability
                                        // Default text color is handled by base styles, but for colored backgrounds:
                                        // If bg is dark/saturated, white text might be better.
                                        // If bg is light (gray-200), black is fine.
                                        // Simple heuristic: if we have a style with background (which are saturated colors here), use white text if possible?
                                        // Or just mix-blend-mode equivalent. 
                                        // Actually `getSlotStyle` returns `text-white` for "All Available".
                                        // Re-implementing simplified logic for this block:
                                        // Re-implementing simplified logic for this block:

                                        let textColorClass = "";

                                        // Rule 3: Count > 0 OR Selected -> White
                                        if (count > 0 || isSelected) {
                                            textColorClass = "text-white";
                                        } else {
                                            // count === 0
                                            if (isCreatorAvailable) {
                                                // Rule 2: Host Selected -> Black
                                                textColorClass = "text-black dark:text-white";
                                                // dark:text-white added for safety in dark mode, but user said "Black". 
                                                // If bg is light (bg-secondary), black is good.
                                            } else {
                                                // Rule 1: Host Not Selected -> Gray
                                                textColorClass = "text-gray-400";
                                            }
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
                                                    "h-8 flex-1 rounded-sm transition-all relative overflow-hidden border border-border/30 flex items-center px-3 justify-center text-[12px] select-none",
                                                    isInteractive ? "cursor-pointer" : "cursor-default",
                                                    className,
                                                    textColorClass,
                                                    // Add borders for hour markers (stronger)
                                                    timeIdx % 2 === 1 && "mr-[1px] !border-r-border/60",
                                                    // Opacity Rule
                                                    isDimmed && "opacity-50 grayscale-[20%]",
                                                    // Creator Availability Border (Gray)
                                                    isCreatorAvailable && "ring-2 ring-inset ring-gray-400 z-10"
                                                )}
                                                style={style}
                                                title={`${count}/${totalParticipants} available${!isCreatorAvailable ? ' (Closed)' : ''} ${isCreatorAvailable ? '(Host Available)' : ''}`}
                                            >
                                                {timeLabel}
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
                        <div className="h-4 w-4 rounded bg-secondary border" />
                        <span>0/{totalParticipants}</span>
                    </div>
                    {totalParticipants > 1 && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded" style={{ backgroundColor: HEATMAP_COLORS[0] }} />
                                <span>1 (Min)</span>
                            </div>
                            {totalParticipants > 2 && (
                                <div className="flex items-center gap-2">
                                    {/* Show a mini-gradient or just 3 dots using the palette */}
                                    <div className="flex gap-[1px]">
                                        {HEATMAP_COLORS.slice(1, -1).map(c => (
                                            <div key={c} className="h-4 w-2" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                    <span>...</span>
                                </div>
                            )}
                            {totalParticipants > 2 && (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 rounded" style={{ backgroundColor: HEATMAP_COLORS[HEATMAP_COLORS.length - 1] }} />
                                    <span>{totalParticipants - 1} (Max-1)</span>
                                </div>
                            )}
                        </>
                    )}
                    {totalParticipants > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded bg-blue-500 shadow-sm" />
                            <span className="font-medium text-blue-600 dark:text-blue-400">{totalParticipants}/{totalParticipants}</span>
                        </div>
                    )}
                    {(isInteractive || selectedSlots.size > 0) && (
                        <div className="ml-4 flex items-center gap-2 text-primary font-medium border-l pl-4">
                            <div className="h-4 w-4 rounded bg-blue-700" />
                            <span>Selected</span>
                        </div>
                    )}
                    <div className="ml-4 flex items-center gap-2 text-gray-500 font-medium border-l pl-4">
                        <div className="h-4 w-4 rounded ring-2 ring-inset ring-gray-400" />
                        <span>Host Pick</span>
                    </div>

                </div>
            </div>
        </div>
    );
}
