"use client";

import { useState } from "react";
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
    isWithinInterval,
    isBefore,
    startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
    startDate: Date | undefined;
    endDate: Date | undefined;
    onChange: (start: Date | undefined, end: Date | undefined) => void;
}

export function DateRangePicker({
    startDate,
    endDate,
    onChange,
}: DateRangePickerProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

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

    const handleDayClick = (day: Date) => {
        if (isBefore(day, startOfDay(new Date()))) return;

        if (!startDate || (startDate && endDate)) {
            onChange(day, undefined);
        } else if (startDate && !endDate) {
            if (isBefore(day, startDate)) {
                onChange(day, undefined);
            } else {
                onChange(startDate, day);
            }
        }
    };

    return (
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {format(currentDate, "MMMM yyyy")}
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
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
                {days.map((day, dayIdx) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSelected =
                        (startDate && isSameDay(day, startDate)) ||
                        (endDate && isSameDay(day, endDate));
                    const isInRange =
                        startDate &&
                        endDate &&
                        isWithinInterval(day, { start: startDate, end: endDate });
                    const isDisabled = isBefore(day, startOfDay(new Date()));

                    return (
                        <button
                            key={day.toString()}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            disabled={isDisabled}
                            className={cn(
                                "relative flex h-10 w-full items-center justify-center rounded-full text-sm transition-colors",
                                !isCurrentMonth && "text-muted-foreground/30",
                                isDisabled && "cursor-not-allowed opacity-30",
                                !isDisabled && "hover:bg-primary/10",
                                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                                isInRange && !isSelected && "bg-primary/10 text-primary rounded-none first:rounded-l-full last:rounded-r-full"
                            )}
                        >
                            {format(day, "d")}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
