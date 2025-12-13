"use client";

import { CalendarView } from "@/components/home/CalendarView";
import { JoinScheduleInput } from "@/components/home/JoinScheduleInput";
import { ScheduleList } from "@/components/home/ScheduleList";
import { useUser } from "@/components/auth/UserProvider";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Mock data
import { ScheduleWithDetails } from "@/models/types";



import { UserEditor } from "@/components/home/ProfileEditor";
import { LandingPage } from "@/components/home/LandingPage";
import { getCreatedScheduleList, getJoinedScheduleList } from "@/services/ScheduleProvider";



export default function Home() {
  const { user, isLoading } = useUser();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  async function getUserSchedules(): Promise<ScheduleWithDetails[]> {
    if (!user) {
      return [];
    }
    const createdSchedules = await getCreatedScheduleList(user.id) as ScheduleWithDetails[];
    const joinedSchedules = await getJoinedScheduleList(user.id, createdSchedules.map((s) => s.id)) as ScheduleWithDetails[];

    return [...createdSchedules, ...joinedSchedules];
  }


  useEffect(() => {
    if (user) {
      setIsFetching(true);
      getUserSchedules()
        .then(setSchedules)
        .finally(() => setIsFetching(false));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UserEditor />
            <p className="text-muted-foreground">
              Manage your schedules and events
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/schedule/new"
              className={cn(
                "flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              )}
            >
              <Plus className="h-4 w-4" />
              New Schedule
            </Link>
          </div>
        </header>

        {/* Join Section */}
        <section className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Have an invite code?</h2>
              <p className="text-sm text-muted-foreground">
                Enter the code shared with you to join an existing schedule.
              </p>
            </div>
            <JoinScheduleInput />
          </div>
        </section>

        {/* Schedules Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Schedules</h2>
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  view === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                List
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  view === "calendar"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Calendar
              </button>
            </div>
          </div>

          {view === "list" ? (
            <ScheduleList schedules={schedules} />
          ) : (
            <CalendarView schedules={schedules} />
          )}
        </section>
      </div>
    </main>
  );
}
