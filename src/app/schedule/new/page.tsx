"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/schedule/DateRangePicker";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { TimeTable } from "@/components/schedule/TimeTable";
import { createNewSchedule } from "@/services/ScheduleProvider";

export default function NewSchedulePage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        dates: [] as Date[],
        availability: [] as string[],
    });


    const handleCreate = async () => {
        if (!formData.title || formData.dates.length === 0) return;


        setIsLoading(true);
        console.log("Creating stuffs...")
        const schedule = await createNewSchedule(
            formData.title,
            formData.description,
            formData.dates,
            formData.availability,
        );
        // Format dates as YYYYMMDD string list
        // Sort dates chronologically first
        const sortedDates = [...formData.dates].sort((a, b) => a.getTime() - b.getTime());
        const dateStrings = sortedDates.map(d => format(d, "yyyyMMdd"));

        console.log("Creating schedule with:", {
            ...formData,
            dates: dateStrings
        });
        console.log(schedule);
        if (!schedule) {
            alert("Failed to create schedule");
            setIsLoading(false);
            return;
        };
        const scheduleId = schedule.id;
        router.push(`/schedule/${scheduleId}`);
    };

    return (
        <main className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-2xl">
                <Link
                    href="/"
                    className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-primary">
                        Create New Schedule
                    </h1>
                    <p className="text-muted-foreground">
                        Set up the details and date range for your event.
                    </p>
                </div>

                <div className="mt-8 space-y-8">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-between px-10 relative">
                        <div className="absolute top-3 left-14 right-14 h-0.5 bg-muted -z-10" />
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex flex-col items-center gap-2 bg-background z-10 px-2">
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                                        step === s || step > s
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {s}
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">
                                    {s === 1 ? "Details" : s === 2 ? "Dates" : "Times"}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Form Content */}
                    <div className="animate-in slide-in-from-bottom-4 duration-500 mt-8">
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="title" className="text-sm font-medium">
                                        Event Title
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        placeholder="e.g., Project Kickoff"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        className="flex h-12 w-full rounded-lg border border-input bg-background px-4 text-sm shadow-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="description" className="text-sm font-medium">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        id="description"
                                        placeholder="Add some details..."
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        className="flex min-h-[120px] w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm shadow-sm transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!formData.title.trim()}
                                    className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Next: Select Dates
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-6">
                                    <DateRangePicker
                                        selectedDates={formData.dates}
                                        onChange={(dates) =>
                                            setFormData({ ...formData, dates })
                                        }
                                    />

                                    <div className="w-full rounded-lg border bg-muted/50 p-4 text-center">
                                        <p className="text-sm text-muted-foreground mb-2">Selected Dates ({formData.dates.length})</p>
                                        <div className="flex flex-wrap gap-2 justify-center max-h-[100px] overflow-y-auto">
                                            {formData.dates.length > 0 ? (
                                                formData.dates.map(date => (
                                                    <span key={date.toISOString()} className="inline-flex items-center rounded-md bg-background border px-2 py-1 text-xs font-medium shadow-sm">
                                                        {format(date, "MMM d")}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground italic text-xs">None selected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="w-full rounded-full border border-input bg-background py-3 font-medium transition-all hover:bg-muted"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep(3)}
                                        disabled={formData.dates.length === 0}
                                        className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        Next: Select Times
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                    <span className="font-semibold">Tip:</span> Drag on the columns to set the available time range for each day.
                                </div>

                                <TimeTable
                                    dates={formData.dates}
                                    availabilities={[]}
                                    onChange={(avail) => setFormData({ ...formData, availability: avail })}
                                />

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full rounded-full border border-input bg-background py-3 font-medium transition-all hover:bg-muted"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={isLoading}
                                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Calendar className="h-4 w-4" />
                                        )}
                                        Create Schedule
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
