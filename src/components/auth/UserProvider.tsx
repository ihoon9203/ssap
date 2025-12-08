"use client";

import { createClient } from "@/lib/supabase/client";
import { User as AuthUser } from "@supabase/supabase-js";
import { User } from "@/models/types";
import { createContext, useContext, useEffect, useState } from "react";


interface UserContextType {
    user: User | null;
    authUser: AuthUser | null;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    user: null,
    authUser: null,
    isLoading: true,
    refreshUser: async () => { },
    signOut: async () => { },
});

export function UserProvider({
    children,
    initialUser,
    initialAuthUser,
}: {
    children: React.ReactNode;
    initialUser?: User | null;
    initialAuthUser?: AuthUser | null;
}) {
    const [user, setUser] = useState<User | null>(initialUser || null);
    const [authUser, setAuthUser] = useState<AuthUser | null>(initialAuthUser || null);
    const [isLoading, setIsLoading] = useState(!initialUser && !initialAuthUser);
    const supabase = createClient();

    const fetchAndMergeProfile = async (baseUser: AuthUser) => {
        setAuthUser(baseUser);
        try {
            const { data: profile, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", baseUser.id)
                .single();

            if (error) {
                // If profile doesn't exist (PGRST116), create it
                if (error.code === "PGRST116") {
                    console.log("User profile not found, creating new user...");
                    const { data: newProfile, error: createError } = await supabase
                        .from("users")
                        .insert({
                            id: baseUser.id,
                            real_name: baseUser.user_metadata?.full_name,
                            avatar_url: baseUser.user_metadata?.avatar_url,
                            username: baseUser.user_metadata?.full_name
                        })
                        .select("*")
                        .single();

                    if (createError) {
                        console.error("Error creating user profile:", createError);
                        // Fallback: create a temporary User object
                        const tempUser: User = {
                            id: baseUser.id,
                            username: baseUser.user_metadata?.full_name || "Unknown",
                            real_name: baseUser.user_metadata?.full_name || "Unknown",
                            avatar_url: baseUser.user_metadata?.avatar_url,
                            updated_at: new Date().toISOString(),
                        };
                        setUser(tempUser);
                    } else {
                        setUser(newProfile as User);
                    }
                } else {
                    console.error("Error fetching user profile:", error);
                    const tempUser: User = {
                        id: baseUser.id,
                        username: baseUser.user_metadata?.full_name || "Unknown",
                        real_name: baseUser.user_metadata?.full_name || "Unknown",
                        avatar_url: baseUser.user_metadata?.avatar_url,
                        updated_at: new Date().toISOString(),
                    };
                    setUser(tempUser);
                }
            } else {
                setUser(profile as User);
            }
        } catch (error) {
            console.error("Error merging profile:", error);
            const tempUser: User = {
                id: baseUser.id,
                username: baseUser.user_metadata?.full_name || "Unknown",
                real_name: baseUser.user_metadata?.full_name || "Unknown",
                avatar_url: baseUser.user_metadata?.avatar_url,
                updated_at: new Date().toISOString(),
            };
            setUser(tempUser);
        }
    };

    const refreshUser = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            await fetchAndMergeProfile(currentUser);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setAuthUser(null);
        window.location.href = "/login"; // Force redirect to clear any client state/cache
    };

    useEffect(() => {
        console.log("[UserProvider] Mount. InitialAuth:", !!initialAuthUser, "InitialDB:", !!initialUser);

        // Initial fetch if we have an auth user but no DB user yet
        if (initialAuthUser && !user) {
            console.log("[UserProvider] Merging initial auth user profile");
            fetchAndMergeProfile(initialAuthUser);
        } else if (!initialAuthUser && !initialUser) {
            // If no initial data, fetch current user
            const init = async () => {
                console.log("[UserProvider] No initial data. Fetching client-side...");
                const { data: { user: currentUser }, error } = await supabase.auth.getUser();
                console.log("[UserProvider] Client fetch result:", currentUser?.id, error);
                if (currentUser) {
                    await fetchAndMergeProfile(currentUser);
                } else {
                    setIsLoading(false);
                }
            };
            init();
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("[UserProvider] AuthStateChange:", event, session?.user?.id);
            if (session?.user) {
                // If we already have the same user loaded, don't re-fetch/flash
                // But we need to ensure profile is merged.
                // We'll trust the logic for now, but log it.
                await fetchAndMergeProfile(session.user);
            } else {
                setUser(null);
                setAuthUser(null);
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <UserContext.Provider value={{ user, authUser, isLoading, refreshUser, signOut }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
