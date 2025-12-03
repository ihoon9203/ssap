"use client";

import { TimeTable } from "@/components/schedule/TimeTable";
import { HeatmapView } from "@/components/schedule/HeatmapView";
import { BestTimeList } from "@/components/schedule/BestTimeList";
import { ButtonHTMLAttributes, useState } from "react";
import { Copy, Check, Users, Clock, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { saveAvailability } from "@/services/schedule";

// Mock data
const MOCK_SCHEDULE = {
    id: "mock-id",
    title: "Project Kickoff",
    description: "Let's find a time to discuss the new project requirements and timeline.",
    startDate: new Date(2024, 3, 10), // April 10, 2024
    endDate: new Date(2024, 3, 12),   // April 12, 2024
    inviteCode: "PROJ-2024",
    participants: [
        { id: "1", name: "Alice", avatar: null },
        { id: "2", name: "Bob", avatar: null },
        { id: "3", name: "Charlie", avatar: null },
        { id: "4", name: "David", avatar: null },
    ]
};

// Mock availabilities
const MOCK_AVAILABILITIES: { [key: string]: number } = {
    "0-20": 4, "0-21": 4, "0-22": 4, // Day 0, 10:00 - 11:30 (Full)
    "0-23": 3, "0-24": 2,            // Day 0, 11:30 - 12:30
    "1-28": 4, "1-29": 4,            // Day 1, 14:00 - 15:00 (Full)
    "2-18": 1, "2-19": 2,            // Day 2, 09:00 - 10:00
};

export default function SchedulePage({ params }: { params: { id: string } }) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"input" | "result">("input");
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [availabilities, setAvailabilities] = useState<{ [key: string]: number }>({});

    const copyInviteCode = () => {
        navigator.clipboard.writeText(MOCK_SCHEDULE.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirm = async () => {
        if (!confirm("Are you sure you want to confirm this schedule? This will notify all participants.")) return;

        // Mock notification logic
        console.log("Sending Discord notification...");
        console.log("Sending Kakao notification...");

        setIsConfirmed(true);
        alert("Schedule confirmed! Notifications sent.");
    };

    const handleSaveAvailability = async () => {
        if (!availabilities) return;

        try {
            await saveAvailability({
                scheduleId: params.id,
                startDate: MOCK_SCHEDULE.startDate,
                availabilities
            });
            alert("Availability saved successfully!");
        } catch (error: any) {
            console.error("Error saving availability:", error);
            alert(error.message || "Failed to save availability.");
        }
    };

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
                                {MOCK_SCHEDULE.title}
                            </h1>
                            {isConfirmed && (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Confirmed
                                </span>
                            )}
                        </div>
                        <p className="max-w-2xl text-muted-foreground">
                            {MOCK_SCHEDULE.description}
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
                            <span className="px-2 text-sm font-medium text-muted-foreground">
                                Code:
                            </span>
                            <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold">
                                {MOCK_SCHEDULE.inviteCode}
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
                            {MOCK_SCHEDULE.participants.map((p, i) => (
                                <div key={p.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-medium text-primary" title={p.name}>
                                    {p.name[0]}
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
                    {activeTab === "input" ? (
                        <div className="space-y-6">
                            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                <span className="font-semibold">Tip:</span> Click and drag to select multiple time slots.
                            </div>
                            <TimeTable
                                startDate={MOCK_SCHEDULE.startDate}
                                endDate={MOCK_SCHEDULE.endDate}
                                onChange={(availabilities) => setAvailabilities(availabilities)}
                            />
                            <div className="flex justify-end gap-4">
                                <button className="rounded-full border border-input bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
                                    Reset
                                </button>
                                <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90" onClick={handleSaveAvailability}>
                                    Save Availability
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-8 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-6">
                                <HeatmapView
                                    startDate={MOCK_SCHEDULE.startDate}
                                    endDate={MOCK_SCHEDULE.endDate}
                                    totalParticipants={MOCK_SCHEDULE.participants.length}
                                    availabilities={MOCK_AVAILABILITIES}
                                />

                                {/* Creator Actions */}
                                <div className="rounded-xl border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold">Finalize Schedule</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Select a time slot on the heatmap above and confirm to notify everyone.
                                    </p>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={handleConfirm}
                                            disabled={isConfirmed}
                                            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            <Bell className="h-4 w-4" />
                                            {isConfirmed ? "Schedule Confirmed" : "Confirm & Notify"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <BestTimeList
                                    startDate={MOCK_SCHEDULE.startDate}
                                    totalParticipants={MOCK_SCHEDULE.participants.length}
                                    availabilities={MOCK_AVAILABILITIES}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
