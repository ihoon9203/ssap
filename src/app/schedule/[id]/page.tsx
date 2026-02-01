"use client";

import { TimeTable } from "@/components/schedule/TimeTable";
import { HeatmapView } from "@/components/schedule/HeatmapView";
import { TimeList } from "@/components/schedule/TimeList";
import { ButtonHTMLAttributes, useState, useEffect, use } from "react";
import { Copy, Check, Users, Clock, Bell } from "lucide-react";
import { cn, groupAdjacentSlots } from "@/lib/utils";
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
    const [activeTab, setActiveTab] = useState<"input" | "result" | "discord">("input");
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [availabilities, setAvailabilities] = useState<string[]>([]);
    const [groupAvailabilities, setGroupAvailabilities] = useState<{ [key: string]: number }>({});
    const [selectedAvailabilities, setSelectedAvailabilities] = useState<Set<string>>(new Set());
    const [members, setMembers] = useState<UserData[]>([]);
    const confirmedAvailabilities = new Set<string>(schedule?.confirmed_schedules ?? []);
    const [inviteUrl, setInviteUrl] = useState("");

    const supabase = createClient();

    useEffect(() => {
        if (typeof window !== 'undefined' && id) {
            const baseRedirectUrl = `${window.location.origin}/api/discord/callback`;
            setInviteUrl(
                `https://discord.com/oauth2/authorize?` +
                `client_id=1445639157396406302` +
                `&response_type=code` +
                `&permissions=3072` +
                `&scope=bot%20applications.commands` +
                `&state=${id}` +
                `&redirect_uri=${encodeURIComponent(baseRedirectUrl)}`
            );
        }
    }, [id]);

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
                    setMembers([data.creator, ...data.participants.filter((p: UserData) => p.id !== data.creator.id)]);

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
        if (!confirm("약속 시간을 확정하시겠습니까? 모든 참여자에게 알림이 전송됩니다.")) return;
        if (currentUser == null) {
            alert("약속 시간을 확정하려면 로그인해주세요.");
            return;
        }
        const { data, error } = await confirmSchedule(id, currentUser.id, Array.from(selectedAvailabilities));
        if (data) {
            setIsConfirmed(true);
            alert("약속 시간이 확정되었습니다! 알림을 보냈습니다.");
        } else {
            alert(error?.message || "약속 시간 확정에 실패했습니다.");
        }
    };

    const handleSaveAvailability = async () => {
        if (!availabilities || availabilities.length === 0) {
            alert("최소 하나 이상의 시간대를 선택해주세요.");
            return;
        }
        if (currentUser == null) {
            alert("약속 일정을 저장하려면 로그인해주세요.");
            return;
        }

        try {
            if (isCreator) {
                // Creator updates the Schedule's available_time
                await updateSchedule(id, currentUser.id, { available_time: availabilities });
                alert("약속 시간이 업데이트되었습니다!");
            } else {
                // Participant saves their availability

                await saveAvailability(id, currentUser.id, availabilities);
                alert("약속 가능한 시간이 저장되었습니다!");
                await fetchGroupAvailabilities();
            }
        } catch (error: any) {
            console.error("Error saving:", error);
            alert(error.message || "저장에 실패했습니다.");
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

        // Filter out creator from group availabilities
        related
            .filter((avail: any) => avail.user_id !== schedule.creator_id)
            .forEach((avail: any) => {
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
                            <Link href="/" className="text-sm text-muted-foreground hover:underline">홈</Link>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-sm font-medium">일정</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-primary">
                                {schedule.title}
                            </h1>
                            {isConfirmed && (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    확정됨
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
                                코드:
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
                                나의 일정
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
                                전체 일정
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab("discord")}
                            className={cn(
                                "border-b-2 pb-3 text-sm font-medium transition-colors",
                                activeTab === "discord"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" color="#5865F2">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-.59 1.227 18.312 18.312 0 0 0-5.526 0 13.48 13.48 0 0 0-.59-1.227.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.04.106 14.1 14.1 0 0 0 1.225 1.994.076.076 0 0 0 .084.028 19.9 19.9 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                                </svg>
                                디스코드 연결
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="pb-4">
                        <div className="flex flex-wrap gap-2">
                            {members.map((member) => (
                                <div key={member.id} className="flex items-center gap-2">
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
                                <span className="font-semibold">Tip:</span> 클릭하고 드래그하여 여러 시간대를 선택할 수 있습니다.
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
                                    초기화
                                </button>
                                <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" onClick={handleSaveAvailability}>
                                    {isCreator ? "일정 시간 업데이트" : "내 일정 저장"}
                                </button>
                            </div>
                        </div>
                    ) : activeTab === "result" ? (
                        <div className="grid gap-8 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-6">
                                <HeatmapView
                                    startDate={scheduleDates[0]}
                                    endDate={scheduleDates[scheduleDates.length - 1]}
                                    totalParticipants={schedule.participants_id?.filter((pid: string) => pid !== schedule.creator_id).length || 0}
                                    creatorAvailableTimes={schedule.available_time}
                                    availabilities={groupAvailabilities}
                                    onSelect={handleScheduleSelect}
                                    selectedSlots={new Set(selectedAvailabilities)}
                                    isInteractive={schedule?.creator_id === currentUser?.id}
                                />

                                {/* Creator Actions - Only show if current user is creator */}
                                {schedule?.creator_id === currentUser?.id && (
                                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                                        <h3 className="text-lg font-semibold">일정 확정하기</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            위 히트맵에서 시간대를 선택하고 확정하면 모두에게 알림을 보냅니다.
                                        </p>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={handleConfirm}
                                                disabled={eqSet(selectedAvailabilities, confirmedAvailabilities)}
                                                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                            >
                                                <Bell className="h-4 w-4" />
                                                확정 및 알림 전송
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-1 space-y-6">
                                <TimeList
                                    startDate={scheduleDates[0]}
                                    totalParticipants={schedule.participants_id?.filter((pid: string) => pid !== schedule.creator_id).length || 1}
                                    availabilities={groupAvailabilities}
                                    selectedAvailabilities={new Set(selectedAvailabilities)}
                                    onScheduleSelect={handleScheduleSelect}
                                />

                                {/* Selected Schedule List */}
                                <div className="rounded-xl border bg-card p-6 shadow-sm">
                                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                        <div className="h-4 w-4 rounded-full bg-black/80" />
                                        선택된 스케줄
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedAvailabilities.size === 0 ? (
                                            <p className="text-sm text-muted-foreground">선택된 시간이 없습니다.</p>
                                        ) : (
                                            <div className="grid gap-2">
                                                {groupAdjacentSlots(Array.from(selectedAvailabilities)).map((range, i) => (
                                                    <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                                                        {range}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            {/* Discord Bot Invite */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">1. 디스코드 봇 추가</h3>
                                <div className="flex flex-col gap-2 rounded-lg border bg-indigo-50 p-4 shadow-sm dark:bg-indigo-900/20">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" color="#5865F2">
                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.48 13.48 0 0 0-.59 1.227 18.312 18.312 0 0 0-5.526 0 13.48 13.48 0 0 0-.59-1.227.074.074 0 0 0-.079-.037 19.791 19.791 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.076.076 0 0 0-.04.106 14.1 14.1 0 0 0 1.225 1.994.076.076 0 0 0 .084.028 19.9 19.9 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                                                서버에 봇 초대하기
                                            </div>
                                            <div className="text-xs text-indigo-700 dark:text-indigo-300">
                                                아래 버튼을 눌러 디스코드 서버에 봇을 추가해주세요.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <a
                                            href={inviteUrl || "#"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                                        >
                                            봇 초대 링크 열기
                                        </a>
                                        <button
                                            onClick={() => {
                                                if (inviteUrl) {
                                                    navigator.clipboard.writeText(inviteUrl);
                                                    alert("Link copied!");
                                                }
                                            }}
                                            className="rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:bg-transparent dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                                        >
                                            링크 복사
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Copy Command */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">2. 알림 연결하기</h3>
                                <div className="rounded-lg border bg-card p-4 shadow-sm">
                                    <p className="mb-3 text-sm text-muted-foreground">
                                        봇이 있는 채널에서 아래 명령어를 입력하여 스케줄 알림을 연결하세요.
                                    </p>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`/ssap-connect schedule_id:${schedule.id}`);
                                                alert("Command copied! Paste it into your Discord channel.");
                                            }}
                                            className="flex-1 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:bg-transparent dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                                        >
                                            링크 복사
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
