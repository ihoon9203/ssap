"use client";

import { Calendar, Clock, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { cn, groupAdjacentSlots, slotToTime } from "@/lib/utils";
import { ko } from "date-fns/locale";

// Mock data type
import { ScheduleWithDetails } from "@/models/types";
import { formatDate } from "@/lib/date";
import { useRouter } from "next/navigation";

export function ScheduleList({ schedules }: { schedules: ScheduleWithDetails[] }) {
    const router = useRouter();
    if (schedules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">약속이 없어요...</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    새로운 약속을 만들거나 초대 코드로 참여해보세요.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {schedules.map((schedule, i) => (
                <div
                    key={schedule.id}
                    className="group relative flex items-center justify-between rounded-xl border bg-card p-4 transition-all hover:shadow-md animate-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${i * 100}ms` }}
                    onClick={() => {
                        router.push(`/schedule/${schedule.id}`);
                    }}
                >
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full",
                                schedule.status === "confirmed"
                                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            )}
                        >
                            {schedule.status === "confirmed" ? (
                                <Clock className="h-6 w-6" />
                            ) : (
                                <Calendar className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <div className="flex flex-wrap gap-1 mt-1">
                                <h3 className="font-semibold">{schedule.title}</h3>
                                <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                                    {schedule.participants_id?.length ?? 0 + 1} Participants
                                </span>
                                {groupAdjacentSlots(schedule.confirmed_schedules ?? []).map((date) => (
                                    <span
                                        key={date.toString()}
                                        className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                                    >
                                        {date}
                                    </span>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {schedule.dates && schedule.dates.length > 0 ? (
                                    <>
                                        {schedule.dates.slice(0, 10).map((date) => (
                                            <span
                                                key={date.toString()}
                                                className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                                            >
                                                {formatDate(new Date(date), "MMM d (EEE)")}
                                            </span>
                                        ))}
                                        {schedule.dates.length > 10 && (
                                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                                                +{schedule.dates.length - 10}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm text-muted-foreground">선택된 날짜가 없어요</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <div className="text-sm font-medium">
                                {schedule.participant_count} 명
                            </div>
                            <div className={cn(
                                "text-xs capitalize",
                                schedule.status === "confirmed" ? "text-green-600" : "text-orange-600"
                            )}>
                                {schedule.status}
                            </div>
                        </div>
                        <button className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
