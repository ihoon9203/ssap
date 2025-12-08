"use client";

import { useState } from "react";
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
    isBefore,
    startOfDay,
    compareAsc,
    formatDate, // Custom localized wrapper
    WEEK_DAYS,  // ["일", "월", ...]
} from "@/lib/date";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
    selectedDates: Date[];
    onChange: (dates: Date[]) => void;
}

export function DateRangePicker({
    selectedDates,
    onChange,
}: DateRangePickerProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dragStart, setDragStart] = useState<Date | null>(null);
    const [dragCurrent, setDragCurrent] = useState<Date | null>(null);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const isDateSelected = (date: Date) => {
        return selectedDates.some((d) => isSameDay(d, date));
    };

    const isInDragRange = (date: Date) => {
        if (!dragStart || !dragCurrent) return false;
        const start = isBefore(dragStart, dragCurrent) ? dragStart : dragCurrent;
        const end = isBefore(dragStart, dragCurrent) ? dragCurrent : dragStart;

        // Check if date is within start and end (inclusive)
        return (isSameDay(date, start) || isBefore(start, date)) &&
            (isSameDay(date, end) || isBefore(date, end));
    };

    const handleMouseDown = (date: Date) => {
        if (isBefore(date, startOfDay(new Date()))) return;
        setDragStart(date);
        setDragCurrent(date);
    };

    const handleMouseEnter = (date: Date) => {
        if (!dragStart) return;
        setDragCurrent(date);
    };

    const handleMouseUp = () => {
        if (!dragStart || !dragCurrent) {
            setDragStart(null);
            setDragCurrent(null);
            return;
        }

        const start = isBefore(dragStart, dragCurrent) ? dragStart : dragCurrent;
        const end = isBefore(dragStart, dragCurrent) ? dragCurrent : dragStart;

        const range = eachDayOfInterval({ start, end });

        // Add new dates to existing selection, avoid duplicates
        // If the range is a single click on an already selected date, toggle it off
        if (isSameDay(start, end) && isDateSelected(start)) {
            const newDates = selectedDates.filter(d => !isSameDay(d, start));
            onChange(newDates.sort(compareAsc));
        } else {
            const newDatesIds = new Set(selectedDates.map(d => startOfDay(d).getTime()));
            range.forEach(date => {
                newDatesIds.add(startOfDay(date).getTime());
            });

            const newDates = Array.from(newDatesIds).map(t => new Date(t));
            onChange(newDates.sort(compareAsc));
        }

        setDragStart(null);
        setDragCurrent(null);
    };

    // Global mouse up to handle release outside
    // In a real app we might attach this to window, but for now simple container handling or assumption is okay. 
    // Ideally we attach to window in useEffect.
    // For simplicity, we'll try to rely on container mouse leave/up or window event.
    // Let's allow simple window listener for robustness.

    // Actually, simple mouse up on buttons works fine if user stays inside. 
    // To be safe, let's wrap the grid in a handler.

    return (
        <div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm select-none"
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                // Optional: Cancel drag if leaving component? Or keep it?
                // Keeping it is better UX usually, but relies on window listener.
                // Resetting for simplicity.
                setDragStart(null);
                setDragCurrent(null);
            }}
        >
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {formatDate(currentDate, "yyyy년 M월")}
                </h2>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={prevMonth}
                        className="rounded-full p-2 hover:bg-muted"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={nextMonth}
                        className="rounded-full p-2 hover:bg-muted"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
                {WEEK_DAYS.map((day) => (
                    <div key={day} className="py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected = isDateSelected(day);
                    const isDragging = isInDragRange(day);
                    const isDisabled = isBefore(day, startOfDay(new Date()));

                    return (
                        <div
                            key={day.toString()}
                            onMouseDown={() => handleMouseDown(day)}
                            onMouseEnter={() => handleMouseEnter(day)}
                            className={cn(
                                "relative flex h-10 w-full items-center justify-center rounded-sm text-sm transition-colors cursor-pointer",
                                !isCurrentMonth && "text-muted-foreground/30",
                                isDisabled && "cursor-not-allowed opacity-30",
                                !isDisabled && "hover:bg-primary/10",
                                (isSelected || isDragging) && "bg-primary text-primary-foreground",
                                isSelected && !isDragging && "bg-primary",
                                isDragging && !isSelected && "bg-primary/50", // Difference for drag preview if needed
                            )}
                        >
                            {formatDate(day, "d")}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 text-center text-xs text-muted-foreground">
                Click and drag to select multiple dates
            </div>
        </div>
    );
}
