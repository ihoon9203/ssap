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
    formatDate,
    WEEK_DAYS,
} from "@/lib/date";
import { format } from "date-fns"; // Keep for internal logic if needed, but perfer localized for display
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
        const dayStr = format(day, "yyyy-MM-dd"); // Internal format
        const dayStrCompact = format(day, "yyyyMMdd"); // Internal format

        return schedules.map(schedule => {
            let matches = false;
            let startTime = "";
            let endTime = "";

            if (schedule.status === "confirmed" && schedule.confirmed_schedules) {
                // Check if any confirmed slot matches this day
                const slotsOnDay = schedule.confirmed_schedules
                    .filter(s => s.startsWith(dayStrCompact + "-"))
                    .map(s => parseInt(s.split("-")[1]))
                    .sort((a, b) => a - b);

                if (slotsOnDay.length > 0) {
                    matches = true;
                    // convert first time slot index to HH:mm
                    const firstSlotIdx = slotsOnDay[0];
                    const lastSlotIdx = slotsOnDay[slotsOnDay.length - 1];
                    const date = new Date();
                    date.setHours(0, 0, 0, 0); // start of day

                    const startDate = new Date(date);
                    startDate.setMinutes(firstSlotIdx * 30);
                    startTime = format(startDate, "HH:mm");

                    const endDate = new Date(date);
                    endDate.setMinutes((lastSlotIdx + 1) * 30);
                    endTime = format(endDate, "HH:mm");
                }
            } else if (schedule.dates) {
                // Check if day is in the candidate dates list
                // schedule.dates format is "YYYY-MM-DD"
                if (schedule.dates.includes(dayStr)) {
                    matches = true;
                }
            } else {
                // Fallback to range check (legacy)
                const start = new Date(schedule.start_date);
                const end = new Date(schedule.end_date);
                const checkDay = new Date(day.setHours(0, 0, 0, 0));
                const s = new Date(start.setHours(0, 0, 0, 0));
                const e = new Date(end.setHours(0, 0, 0, 0));
                matches = checkDay >= s && checkDay <= e;

                startTime = format(start, "HH:mm");
                endTime = format(end, "HH:mm");
            }

            if (matches) return { schedule, startTime, endTime };
            return null;
        }).filter((item): item is { schedule: ScheduleWithDetails, startTime: string, endTime: string } => item !== null);
    };

    return (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    {formatDate(currentDate, "yyyy년 M월")}
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
                {WEEK_DAYS.map((day) => (
                    <div key={day} className="py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
                {days.map((day, dayIdx) => {
                    const dayItems = getSchedulesForDay(day);
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
                                {dayItems.map(({ schedule, startTime, endTime }) => {
                                    const participantCount = schedule.participants_id?.length || 0;

                                    return (
                                        <Link
                                            key={schedule.id}
                                            href={`/schedule/${schedule.id}`}
                                            className="group relative block"
                                        >
                                            <div
                                                className={cn(
                                                    "rounded px-1.5 py-0.5 text-[10px] font-medium flex gap-1.5 items-baseline leading-none transition-colors",
                                                    schedule.status === "confirmed"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/70"
                                                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/70"
                                                )}
                                            >
                                                {startTime && <span className="text-[9px] opacity-80">{startTime}</span>}
                                                <span className="truncate flex-1 text-left">{schedule.title}</span>
                                            </div>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] hidden group-hover:block z-50">
                                                <div className="bg-popover text-popover-foreground text-xs rounded-md border shadow-md p-2 flex flex-col gap-1 items-center animate-in fade-in zoom-in-95 duration-200">
                                                    <span className="font-semibold whitespace-nowrap">
                                                        {startTime} ~ {endTime}
                                                    </span>
                                                    <span className="text-muted-foreground whitespace-nowrap">
                                                        {participantCount}명 참여 중
                                                    </span>
                                                    {/* Triangle arrow */}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
