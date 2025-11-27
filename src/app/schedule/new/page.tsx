"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateRangePicker } from "@/components/schedule/DateRangePicker";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function NewSchedulePage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
    });

    const handleCreate = async () => {
        if (!formData.title || !formData.startDate || !formData.endDate) return;

        setIsLoading(true);
        // TODO: Call API to create schedule
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock redirect to a new schedule ID
        router.push("/schedule/mock-id");
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
                    <div className="flex items-center gap-4">
                        <div
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                                step === 1
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-primary/20 text-primary"
                            )}
                        >
                            1
                        </div>
                        <div className="h-0.5 flex-1 bg-muted" />
                        <div
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                                step === 2
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            2
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        {step === 1 ? (
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
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-6">
                                    <DateRangePicker
                                        startDate={formData.startDate}
                                        endDate={formData.endDate}
                                        onChange={(start, end) =>
                                            setFormData({ ...formData, startDate: start, endDate: end })
                                        }
                                    />

                                    <div className="w-full rounded-lg border bg-muted/50 p-4 text-center">
                                        <p className="text-sm text-muted-foreground">Selected Range</p>
                                        <p className="mt-1 font-medium">
                                            {formData.startDate
                                                ? format(formData.startDate, "MMM d, yyyy")
                                                : "Start Date"}{" "}
                                            -{" "}
                                            {formData.endDate
                                                ? format(formData.endDate, "MMM d, yyyy")
                                                : "End Date"}
                                        </p>
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
                                        onClick={handleCreate}
                                        disabled={!formData.startDate || !formData.endDate || isLoading}
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
