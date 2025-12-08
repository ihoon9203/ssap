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
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { ScheduleWithDetails } from "@/models/types";

export function CalendarView({ schedules }: { schedules: ScheduleWithDetails[] }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const getSchedulesForDay = (day: Date) => {
        return schedules.filter((schedule) => {
            const start = new Date(schedule.start_date);
            const end = new Date(schedule.end_date);
            // Simple check if day is within range (inclusive)
            // Reset times for accurate comparison
            const checkDay = new Date(day.setHours(0, 0, 0, 0));
            const s = new Date(start.setHours(0, 0, 0, 0));
            const e = new Date(end.setHours(0, 0, 0, 0));
            return checkDay >= s && checkDay <= e;
        });
    };

    return (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    {format(currentDate, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={prevMonth}
                        className="rounded-full p-2 hover:bg-muted"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
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
                    const daySchedules = getSchedulesForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "group relative flex min-h-[100px] flex-col rounded-lg border p-2 transition-colors hover:bg-muted/50",
                                !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                                isSameDay(day, new Date()) && "bg-primary/5 ring-1 ring-primary"
                            )}
                        >
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    !isCurrentMonth && "text-muted-foreground/50"
                                )}
                            >
                                {format(day, "d")}
                            </span>

                            <div className="mt-1 space-y-1">
                                {daySchedules.map((schedule) => (
                                    <div
                                        key={schedule.id}
                                        className={cn(
                                            "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                                            schedule.status === "confirmed"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                        )}
                                        title={schedule.title}
                                    >
                                        {schedule.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
