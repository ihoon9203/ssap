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
                            약속 조율을 <br />
                            <span className="text-primary">더 간편하고 확실하게</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground">
                            SSAP과 함께라면 우리 모두에게 딱 맞는 시간을 찾는 것이 쉬워집니다.
                            지루한 연락은 그만, 시각적인 스케줄링을 경험하세요.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                href="/login"
                                className="rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                시작하기
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
                                    <h3 className="font-semibold text-foreground">간편한 약속 생성</h3>
                                    <p className="mt-1 flex-auto text-muted-foreground">
                                        몇 초 만에 새로운 이벤트를 만드세요. 날짜와 시간을 정하고 링크 하나로 팀원을 초대하면 끝입니다.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Clock className="h-6 w-6 text-primary" aria-hidden="true" />
                                </div>
                                <div className="flex flex-auto flex-col text-base leading-7">
                                    <h3 className="font-semibold text-foreground">가능한 시간 공유</h3>
                                    <p className="mt-1 flex-auto text-muted-foreground">
                                        참여자는 드래그만으로 자유롭게 가능한 시간을 표시할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Users className="h-6 w-6 text-primary" aria-hidden="true" />
                                </div>
                                <div className="flex flex-auto flex-col text-base leading-7">
                                    <h3 className="font-semibold text-foreground">최적의 시간 찾기</h3>
                                    <p className="mt-1 flex-auto text-muted-foreground">
                                        모두에게 맞는 최적의 시간대를 시각적인 히트맵으로 즉시 확인하세요.
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
