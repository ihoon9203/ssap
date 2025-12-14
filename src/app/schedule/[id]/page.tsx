"use client";

import { TimeTable } from "@/components/schedule/TimeTable";
import { HeatmapView } from "@/components/schedule/HeatmapView";
import { TimeList } from "@/components/schedule/TimeList";
import { ButtonHTMLAttributes, useState, useEffect, use } from "react";
import { Copy, Check, Users, Clock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { readSchedule, saveAvailability, updateSchedule, getRelatedAvailabilities, setScheduleStatus, confirmSchedule, readScheduleWithRpc, UserData } from "@/services/ScheduleProvider";
import { eachDayOfInterval } from "date-fns";
import { createClient } from "@/lib/supabase/client"; import { User } from "@supabase/supabase-js";

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [schedule, setSchedule] = useState<any | null>(null); // Use proper type if available
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
    const [isCreator, setIsCreator] = useState(false);

    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"input" | "result">("input");
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [availabilities, setAvailabilities] = useState<string[]>([]);
    const [groupAvailabilities, setGroupAvailabilities] = useState<{ [key: string]: number }>({});
    const [selectedAvailabilities, setSelectedAvailabilities] = useState<Set<string>>(new Set());
    const [members, setMembers] = useState<UserData[]>([]);
    const confirmedAvailabilities = new Set<string>(schedule?.confirmed_schedules ?? []);

    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        checkUser();
    }, []);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                setIsLoading(true);
                const data = await readScheduleWithRpc(id);
                if (data) {
                    setSchedule(data.schedule);
                    setMembers([data.creator, ...data.participants]);

                    // Initialize selected availabilities from Schedule
                    if (data.schedule.confirmed_schedules) {
                        setSelectedAvailabilities(new Set(data.schedule.confirmed_schedules));
                    }

                    // Determine Role
                    if (currentUser && data.creator.id === currentUser.id) {
                        setIsCreator(true);
                        // Creator starts with the schedule's available times
                        if (data.schedule.available_time) {
                            setAvailabilities(data.schedule.available_time);
                        }
                    } else if (currentUser) {
                        // select my availability if exist only
                        const { data, error } = await supabase
                            .from('availabilities')
                            .select()
                            .eq('user_id', currentUser.id)
                            .eq('schedule_id', id)
                            .single();
                        if (data) {
                            setAvailabilities(data.schedule.selected_times);
                        }
                    }
                } else {
                    setError("Schedule not found");
                }

            } catch (err: any) {
                setError(err.message || "Failed to load schedule");
            } finally {
                setIsLoading(false);
            }
        };

        if (id && currentUser !== undefined) { // Wait for user check (even if null)
            fetchSchedule();
        }
    }, [id, currentUser]);

    const copyInviteCode = () => {
        if (schedule?.invite_code) {
            navigator.clipboard.writeText(schedule.invite_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleConfirm = async () => {
        if (!confirm("Are you sure you want to confirm this schedule? This will notify all participants.")) return;
        const { data, error } = await confirmSchedule(id, Array.from(selectedAvailabilities));
        if (data) {
            setIsConfirmed(true);
            alert("Schedule confirmed! Notifications sent.");
        } else {
            alert(error?.message || "Failed to confirm schedule.");
        }
    };

    const handleSaveAvailability = async () => {
        if (!availabilities || availabilities.length === 0) {
            alert("Please select at least one availability.");
            return;
        }

        try {
            if (isCreator) {
                // Creator updates the Schedule's available_time
                await updateSchedule(id, { available_time: availabilities });
                alert("Schedule times updated successfully!");
            } else {
                // Participant saves their availability
                if (!currentUser) return; // Should be handled by logic but safety check

                await saveAvailability(id, currentUser.id, availabilities);
                alert("Availability saved successfully!");
                await fetchGroupAvailabilities();
            }
        } catch (error: any) {
            console.error("Error saving:", error);
            alert(error.message || "Failed to save.");
        }
    };

    const handleScheduleSelect = (groupKeys: string[]) => {
        setSelectedAvailabilities(prev => {
            // Check if all keys in the new group are already selected
            const allSelected = groupKeys.every(key => prev.has(key));

            if (allSelected) {
                // If already selected, deselect them (remove from array)
                const newSet = new Set(prev);

                // 2. 제거할 키들을 순회하며 Set에서 삭제합니다.
                groupKeys.forEach(key => {
                    newSet.delete(key);
                });

                return newSet;
            } else {
                // If not (or partially) selected, select them (merged with existing)
                // Use Set to ensure uniqueness
                return new Set([...prev, ...groupKeys]);
            }
        });
    };

    // Convert string dates from DB back to Date objects for TimeTable
    const scheduleDates = schedule?.dates
        ? schedule.dates.map((d: string) => new Date(d))
        : [];

    const fetchGroupAvailabilities = async () => {
        if (!schedule) return;

        const related = await getRelatedAvailabilities(id);

        const counts: { [key: string]: number } = {};

        // Calculate day differencehelper
        const getDayDiff = (dateStr: string) => {
            // dateStr is yyyyMMdd
            // schedule start date is schedule.dates[0] (string yyyy-MM-dd probably, but we have scheduleDates as Dates)
            if (!scheduleDates.length) return -1;

            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1;
            const day = parseInt(dateStr.substring(6, 8));
            const targetDate = new Date(year, month, day);

            // Normalize start date to midnight just in case
            const startDate = new Date(scheduleDates[0]);
            startDate.setHours(0, 0, 0, 0);

            const diffTime = targetDate.getTime() - startDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        };

        related.forEach((avail: any) => {
            if (avail.selected_times) {
                avail.selected_times.forEach((timeStr: string) => {
                    // timeStr: yyyyMMdd-timeIdx
                    const [datePart, timePart] = timeStr.split('-');
                    const timeIdx = parseInt(timePart);
                    const dayIdx = getDayDiff(datePart);

                    if (dayIdx >= 0) {
                        const key = `${dayIdx}-${timeIdx}`;
                        counts[key] = (counts[key] || 0) + 1;
                    }
                });
            }
        });

        setGroupAvailabilities(counts);
    };

    const eqSet = (xs: Set<string>, ys: Set<string>) =>
        xs.size === ys.size &&
        [...xs].every((x) => ys.has(x));

    useEffect(() => {
        if (schedule) {
            fetchGroupAvailabilities();
        }
    }, [schedule]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (error || !schedule) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-destructive">Error</h1>
                <p className="text-muted-foreground">{error || "Schedule not found"}</p>
                <Link href="/" className="text-primary hover:underline">
                    Go Home
                </Link>
            </div>
        );
    }

    function getUserAvatar(): import("react").ReactNode {
        throw new Error("Function not implemented.");
    }

    return (
        <main className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Link href="/" className="text-sm text-muted-foreground hover:underline">Home</Link>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-sm font-medium">Schedule</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-primary">
                                {schedule.title}
                            </h1>
                            {isConfirmed && (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Confirmed
                                </span>
                            )}
                        </div>
                        <p className="max-w-2xl text-muted-foreground">
                            {schedule.description}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
                            <span className="px-2 text-sm font-medium text-muted-foreground">
                                Code:
                            </span>
                            <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold">
                                {schedule.invite_code}
                            </code>
                            <button
                                onClick={copyInviteCode}
                                className="rounded-md p-2 hover:bg-muted"
                                title="Copy Code"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        </div>

                        <div className="flex -space-x-2">
                            {schedule.participants_id?.map((pid: string, i: number) => (
                                <div key={pid} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-medium text-primary" title={pid}>
                                    {pid.substring(0, 2).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab("input")}
                            className={cn(
                                "border-b-2 pb-3 text-sm font-medium transition-colors",
                                activeTab === "input"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                My Availability
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("result")}
                            className={cn(
                                "border-b-2 pb-3 text-sm font-medium transition-colors",
                                activeTab === "result"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Group Result
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="pb-4">
                        <div className="flex flex-wrap gap-2">
                            {members.map((member) => (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="group flex items-center gap-3 rounded-full border bg-background px-5 py-2.5 text-base font-medium shadow-sm transition-colors hover:bg-muted"
                                        title="Edit name"
                                    >
                                        <img src={member?.avatar_url || ''} alt="User Avatar" className="h-8 w-8 rounded-full" />
                                        <span>{member.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {activeTab === "input" ? (
                        <div className="space-y-6">
                            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                <span className="font-semibold">Tip:</span> Click and drag to select multiple time slots.
                            </div>
                            <TimeTable
                                dates={scheduleDates}
                                availabilities={availabilities}
                                allowedSlots={isCreator ? undefined : schedule?.available_time}
                                onChange={(availabilities) => setAvailabilities(availabilities)}
                            />
                            <div className="flex justify-end gap-4">
                                <button className="rounded-full border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted" onClick={() => {
                                    // Reset logic
                                    if (isCreator && schedule?.available_time) setAvailabilities(schedule.available_time);
                                    else setAvailabilities([]);
                                }}>
                                    Reset
                                </button>
                                <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" onClick={handleSaveAvailability}>
                                    {isCreator ? "Update Schedule Times" : "Save Availability"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-8 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-6">
                                <HeatmapView
                                    startDate={scheduleDates[0]}
                                    endDate={scheduleDates[scheduleDates.length - 1]}
                                    totalParticipants={schedule.participants_id?.length || 0}
                                    creatorAvailableTimes={schedule.available_time}
                                    availabilities={groupAvailabilities}
                                />

                                {/* Creator Actions - Only show if current user is creator */}
                                {schedule?.creator_id === currentUser?.id && (
                                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                                        <h3 className="text-lg font-semibold">Finalize Schedule</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Select a time slot on the heatmap above and confirm to notify everyone.
                                        </p>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={handleConfirm}
                                                disabled={eqSet(selectedAvailabilities, confirmedAvailabilities)}
                                                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                            >
                                                <Bell className="h-4 w-4" />
                                                Confirm & Notify
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-1">
                                <TimeList
                                    startDate={scheduleDates[0]}
                                    totalParticipants={schedule.participants_id?.length || 1}
                                    availabilities={groupAvailabilities}
                                    selectedAvailabilities={new Set(selectedAvailabilities)}
                                    onScheduleSelect={handleScheduleSelect}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
