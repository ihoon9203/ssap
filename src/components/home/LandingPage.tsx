import Link from "next/link";
import { ArrowRight, Calendar, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                            Schedule meetings <br />
                            <span className="text-primary">without the chaos</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground">
                            SSAP makes it effortless to find the perfect time for your group.
                            No more back-and-forth emails. Just simple, visual scheduling.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                href="/login"
                                className="rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Feature Grid */}
                <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
                    <div className="mx-auto max-w-2xl lg:max-w-none">
                        <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                            <div className="flex flex-col">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Calendar className="h-6 w-6 text-primary" aria-hidden="true" />
                                </div>
                                <div className="flex flex-auto flex-col text-base leading-7">
                                    <h3 className="font-semibold text-foreground">Create Schedules</h3>
                                    <p className="mt-1 flex-auto text-muted-foreground">
                                        Set up a new event in seconds. Define dates, times, and invite your team with a simple link.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
                                </div>
                                <div className="flex flex-auto flex-col text-base leading-7">
                                    <h3 className="font-semibold text-foreground">Share Availability</h3>
                                    <p className="mt-1 flex-auto text-muted-foreground">
                                        Participants drag and drop to mark their free time. No login required for guests.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Users className="h-6 w-6 text-primary" aria-hidden="true" />
                                </div>
                                <div className="flex flex-auto flex-col text-base leading-7">
                                    <h3 className="font-semibold text-foreground">Find the Best Time</h3>
                                    <p className="mt-1 flex-auto text-muted-foreground">
                                        Instantly see the best time slots that work for everyone with our visual heatmap.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
