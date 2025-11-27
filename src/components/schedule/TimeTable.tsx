"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { format, eachDayOfInterval, addMinutes, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeTableProps {
    startDate: Date;
    endDate: Date;
    onChange?: (availability: { [key: string]: number }) => void; // TODO: Define proper type
}

export function TimeTable({ startDate, endDate, onChange }: TimeTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ dayIdx: number; timeIdx: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ dayIdx: number; timeIdx: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(true); // true = selecting, false = deselecting
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | null>(null);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Generate 30-min intervals for 24 hours (48 slots)
    const timeSlots = Array.from({ length: 48 }, (_, i) => {
        const date = addMinutes(startOfDay(new Date()), i * 30);
        return format(date, "HH:mm");
    });

    const getSelectionBox = () => {
        if (!dragStart || !dragCurrent) return null;

        const minDay = Math.min(dragStart.dayIdx, dragCurrent.dayIdx);
        const maxDay = Math.max(dragStart.dayIdx, dragCurrent.dayIdx);
        const minTime = Math.min(dragStart.timeIdx, dragCurrent.timeIdx);
        const maxTime = Math.max(dragStart.timeIdx, dragCurrent.timeIdx);

        return { minDay, maxDay, minTime, maxTime };
    };

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
    }, [isDragging, dragStart, dragCurrent]);

    const handleMouseDown = (dayIdx: number, timeIdx: number) => {
        setIsDragging(true);
        setDragStart({ dayIdx, timeIdx });
        setDragCurrent({ dayIdx, timeIdx });

        // Determine if we are selecting or deselecting based on the start cell
        const key = `${dayIdx}-${timeIdx}`;
        setIsSelecting(!selectedSlots.has(key));
    };

    const handleMouseEnter = (dayIdx: number, timeIdx: number) => {
        if (!isDragging) return;
        setDragCurrent({ dayIdx, timeIdx });
    };

    const handleMouseUp = () => {
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
                    const key = `${d}-${t}`;
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
                const availabilityObj: { [key: string]: number } = {};
                newSlots.forEach(key => {
                    availabilityObj[key] = 1;
                });
                onChange(availabilityObj);
            }
        }

        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        setOverlayStyle(null);
    };

    useEffect(() => {
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [isDragging, dragStart, dragCurrent]);

    const selectionBox = getSelectionBox();

    return (
        <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm select-none">
            <div className="overflow-x-auto relative" ref={containerRef}>
                <div className="min-w-[1200px] p-6 relative">
                    {/* Overlay */}
                    {overlayStyle && (
                        <div
                            className="absolute z-20 rounded-md border border-primary bg-primary/20 pointer-events-none transition-all duration-75"
                            style={overlayStyle}
                        />
                    )}

                    {/* Header Row (Times) */}
                    <div className="mb-4 flex">
                        <div className="w-32 flex-shrink-0" /> {/* Spacer for dates */}
                        <div className="flex flex-1 justify-between text-xs text-muted-foreground">
                            {timeSlots.filter((_, i) => i % 2 === 0).map((time) => (
                                <div key={time} className="w-8 text-center -ml-4">{time}</div>
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

                                {/* Time Grid */}
                                <div className="flex flex-1">
                                    {timeSlots.map((_, timeIdx) => {
                                        const key = `${dayIdx}-${timeIdx}`;
                                        const isSelected = selectedSlots.has(key);

                                        let isInBox = false;
                                        if (isDragging && selectionBox) {
                                            isInBox =
                                                dayIdx >= selectionBox.minDay &&
                                                dayIdx <= selectionBox.maxDay &&
                                                timeIdx >= selectionBox.minTime &&
                                                timeIdx <= selectionBox.maxTime;
                                        }

                                        const visualSelected = isInBox ? isSelecting : isSelected;
                                        const isHourEnd = timeIdx % 2 === 1;

                                        return (
                                            <div
                                                key={timeIdx}
                                                data-day={dayIdx}
                                                data-time={timeIdx}
                                                onMouseDown={(e) => { e.preventDefault(); handleMouseDown(dayIdx, timeIdx); }}
                                                onMouseEnter={() => handleMouseEnter(dayIdx, timeIdx)}
                                                className={cn(
                                                    "h-10 flex-1 cursor-pointer transition-colors border-r border-border/20",
                                                    visualSelected ? "bg-primary" : "bg-muted/30 hover:bg-primary/10",
                                                    // Stronger divider for hour ends
                                                    isHourEnd && "border-r-border/60",
                                                    // First item rounded left
                                                    timeIdx === 0 && "rounded-l-sm",
                                                    // Last item rounded right and no border
                                                    timeIdx === timeSlots.length - 1 && "rounded-r-sm border-r-0"
                                                )}
                                                title={`${format(day, "MMM d")} ${timeSlots[timeIdx]}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                Click and drag to select a range of times
            </div>
        </div>
    );
}
