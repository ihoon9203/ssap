"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { formatDate, eachDayOfInterval, addMinutes, startOfDay } from "@/lib/date";
import { cn } from "@/lib/utils";

interface TimeTableProps {
    dates: Date[];
    availabilities: string[];
    allowedSlots?: string[];
    onChange?: (availability: string[]) => void;
}

export function TimeTable({ dates, availabilities, allowedSlots, onChange }: TimeTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ dayIdx: number; timeIdx: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ dayIdx: number; timeIdx: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(true); // true = selecting, false = deselecting
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set(availabilities));
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);

    // Sync selectedSlots when prop changes (e.g. initial load)
    useEffect(() => {
        setSelectedSlots(new Set(availabilities));
    }, [availabilities]);

    // dates prop is used directly instead of generating from interval

    // Generate 30-min intervals for 24 hours (48 slots)
    const timeSlots = useMemo(() => Array.from({ length: 48 }, (_, i) => {
        const date = addMinutes(startOfDay(new Date()), i * 30);
        return formatDate(date, "HH:mm");
    }), []);

    const getSelectionBox = useCallback(() => {
        if (!dragStart || !dragCurrent) return null;

        const minDay = Math.min(dragStart.dayIdx, dragCurrent.dayIdx);
        const maxDay = Math.max(dragStart.dayIdx, dragCurrent.dayIdx);
        const minTime = Math.min(dragStart.timeIdx, dragCurrent.timeIdx);
        const maxTime = Math.max(dragStart.timeIdx, dragCurrent.timeIdx);

        const startDateStr = formatDate(dates[minDay], "yyyyMMdd");
        const endDateStr = formatDate(dates[maxDay], "yyyyMMdd");

        return { minDay, maxDay, minTime, maxTime, startDateStr, endDateStr };
    }, [dragStart, dragCurrent, dates]);

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
        const key = `${formatDate(dates[dayIdx], "yyyyMMdd")}-${timeIdx}`;

        // Check constraint
        if (allowedSlots && !allowedSlots.includes(key)) return;

        setIsDragging(true);
        setDragStart({ dayIdx, timeIdx });
        setDragCurrent({ dayIdx, timeIdx });

        // Determine if we are selecting or deselecting based on the start cell
        // Accessing state directly inside callback - make sure dependencies are correct
        // But since we need current selectedSlots, adding it to dependencies.
        // This will update the function ref when selectedSlots changes.
        // Since selectedSlots only changes on MouseUp, this reference is stable DURING drag.
        setIsSelecting(!selectedSlots.has(key));
    }, [dates, allowedSlots, selectedSlots]);

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
        if (box) {
            const newSlots = new Set(selectedSlots);

            for (let d = box.minDay; d <= box.maxDay; d++) {
                for (let t = box.minTime; t <= box.maxTime; t++) {
                    const key = `${formatDate(dates[d], "yyyyMMdd")}-${t}`;
                    if (allowedSlots && !allowedSlots.includes(key)) continue;

                    if (isSelecting) {
                        newSlots.add(key);
                    } else {
                        newSlots.delete(key);
                    }
                }
            }
            setSelectedSlots(newSlots);

            // Trigger onChange
            if (onChange) {
                const availabilityObj: string[] = [];
                newSlots.forEach(key => {
                    availabilityObj.push(key);
                });
                onChange(availabilityObj);
            }
        }

        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        setOverlayStyle(null);
    }, [isDragging, dragStart, dragCurrent, getSelectionBox, selectedSlots, allowedSlots, isSelecting, onChange, dates]);

    useEffect(() => {
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [handleMouseUp]);

    const handleDayClick = useCallback((dayIdx: number) => {
        const slotsForDay: string[] = [];
        const dateStr = formatDate(dates[dayIdx], "yyyyMMdd");

        // Collect all valid slots for the day
        for (let t = 0; t < 48; t++) {
            const key = `${dateStr}-${t}`;
            if (allowedSlots && !allowedSlots.includes(key)) continue;
            slotsForDay.push(key);
        }

        if (slotsForDay.length === 0) return;

        // Check if all are already selected
        const allSelected = slotsForDay.every(key => selectedSlots.has(key));

        const newSlots = new Set(selectedSlots);
        if (allSelected) {
            // Deselect all
            slotsForDay.forEach(key => newSlots.delete(key));
        } else {
            // Select all
            slotsForDay.forEach(key => newSlots.add(key));
        }

        setSelectedSlots(newSlots);

        if (onChange) {
            const availabilityObj: string[] = [];
            newSlots.forEach(key => {
                availabilityObj.push(key);
            });
            onChange(availabilityObj);
        }

    }, [dates, allowedSlots, selectedSlots, onChange]);

    const gridContent = useMemo(() => (
        <div className="space-y-2">
            {dates.map((day, dayIdx) => (
                <div key={day.toString()} className="flex items-center gap-4">
                    {/* Date Label */}
                    <div
                        className="w-28 flex-shrink-0 text-sm font-medium cursor-pointer transition-all 
                        flex items-center justify-center h-10 rounded-md border border-border/40 bg-muted/30
                        hover:bg-primary/10 hover:border-primary/50 hover:text-primary active:scale-95"
                        onClick={() => handleDayClick(dayIdx)}
                        title="Click to select/deselect all day"
                    >
                        {formatDate(day, "EEE, MMM d")}
                    </div>

                    {/* Time Grid */}
                    <div className="flex flex-1">
                        {timeSlots.map((_, timeIdx) => {
                            const key = `${formatDate(day, "yyyyMMdd")}-${timeIdx}`;
                            const isSelected = selectedSlots.has(key);
                            const isDisabled = allowedSlots && !allowedSlots.includes(key);

                            // Removed isInBox logic to defer selection visual to overlay only

                            const isHourEnd = timeIdx % 2 === 1;
                            const isLast = timeIdx === timeSlots.length - 1;

                            return (
                                <div
                                    key={timeIdx}
                                    data-day={dayIdx}
                                    data-time={timeIdx}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        if (!isDisabled) handleMouseDown(dayIdx, timeIdx);
                                    }}
                                    onMouseEnter={() => {
                                        if (!isDisabled) handleMouseEnter(dayIdx, timeIdx);
                                    }}
                                    className={cn(
                                        "h-10 flex-1 rounded-sm transition-all hover:ring-2 hover:ring-ring hover:z-10",
                                        isDisabled
                                            ? "bg-gray-200 dark:bg-gray-800 cursor-not-allowed" // Disabled style
                                            : "cursor-pointer",
                                        !isDisabled && (isSelected ? "bg-primary" : "bg-muted/30 hover:bg-primary/10"),
                                        // Hour markers
                                        !isLast && (isHourEnd ? "mr-2" : "mr-px")
                                    )}
                                    title={
                                        isDisabled
                                            ? "Unavailable"
                                            : `${formatDate(day, "M월 d일")} ${timeSlots[timeIdx]}`
                                    }
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    ), [dates, timeSlots, selectedSlots, allowedSlots, handleMouseDown, handleMouseEnter, handleDayClick]);

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
                    <div className="mb-2 flex">
                        <div className="w-32 flex-shrink-0" /> {/* Spacer for dates */}
                        <div className="flex flex-1">
                            {Array.from({ length: 24 }).map((_, i) => {
                                const time = timeSlots[i * 2];
                                const isLast = i === 23;

                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex-1 flex items-center justify-center text-xs text-muted-foreground",
                                            !isLast && "mr-2"
                                        )}
                                    >
                                        {time}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rows */}
                    {gridContent}
                </div>
            </div>

            <div className="border-t bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                Click and drag to select a range of times
            </div>
        </div>
    );
}
