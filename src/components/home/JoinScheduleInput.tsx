"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchSchedule, joinSchedule } from "@/services/ScheduleProvider";
import { createClient } from "@/lib/supabase/client";
import { Schedule } from "@/models/types";

export function JoinScheduleInput() {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [foundSchedule, setFoundSchedule] = useState<Schedule | null>(null);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        // Clean functionality
        setFoundSchedule(null);

        try {
            const schedule = await searchSchedule(code.trim());
            if (!schedule) {
                alert("Schedule not found");
            } else {
                setFoundSchedule(schedule);
                setShowModal(true);
            }
        } catch (error) {
            console.error("Error searching:", error);
            alert("Error searching for schedule");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmJoin = async () => {
        if (!foundSchedule) return;
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please login first");
                router.push("/login");
                return;
            }
            console.log("Joining schedule with ID:", foundSchedule.id, "and user ID:", user.id);
            await joinSchedule(foundSchedule.id, user.id);

            // Close modal and redirect
            setShowModal(false);
            setFoundSchedule(null);
            router.push(`/schedule/${foundSchedule.id}`);
        } catch (error) {
            console.error("Failed to join:", error);
            alert("Failed to join schedule.");
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setFoundSchedule(null);
    };

    return (
        <form onSubmit={handleJoin} className="relative w-full max-w-sm">
            <input
                type="text"
                placeholder="초대 코드를 입력해주세요"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={cn(
                    "h-12 w-full rounded-full border border-input bg-background px-6 pr-12 text-sm shadow-sm transition-colors",
                    "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                disabled={isLoading}
            />
            <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className={cn(
                    "absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90",
                    "disabled:opacity-50 disabled:hover:bg-primary"
                )}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <ArrowRight className="h-4 w-4" />
                )}
                <span className="sr-only">약속 참여하기</span>
            </button>

            {/* Simple Modal Overlay */}
            {showModal && foundSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl ring-1 ring-border">
                        <div className="mb-4 flex items-start justify-between">
                            <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                일정에 참여하시겠습니까?
                            </h3>
                            <button
                                onClick={closeModal}
                                type="button"
                                className="rounded-full p-1 opacity-70 hover:bg-accent hover:opacity-100 transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-lg bg-muted/50 p-4">
                                <h4 className="font-medium text-foreground">{foundSchedule.title}</h4>
                                {foundSchedule.description && (
                                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                        {foundSchedule.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmJoin}
                                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    참여하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
