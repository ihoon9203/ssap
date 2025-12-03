"use client";

import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

export interface ExtendedUser extends User {
    username?: string;
    full_name?: string;
    avatar_url?: string;
}

interface UserContextType {
    user: ExtendedUser | null;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    user: null,
    isLoading: true,
    refreshUser: async () => { },
});

export function UserProvider({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User | null;
}) {
    const [user, setUser] = useState<ExtendedUser | null>(initialUser);
    const [isLoading, setIsLoading] = useState(!initialUser);
    const supabase = createClient();

    const fetchAndMergeProfile = async (baseUser: User) => {
        try {
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("username, full_name, avatar_url")
                .eq("id", baseUser.id)
                .single();

            if (error) {
                // If profile doesn't exist (PGRST116), create it
                if (error.code === "PGRST116") {
                    console.log("Profile not found, creating new profile...");
                    // Note: username must be unique, so using full_name might fail if duplicate.
                    // Ideally we should handle this, but following user's lead for now.
                    const { data: newProfile, error: createError } = await supabase
                        .from("profiles")
                        .insert({
                            id: baseUser.id,
                            full_name: baseUser.user_metadata?.full_name,
                            avatar_url: baseUser.user_metadata?.avatar_url,
                            username: baseUser.user_metadata?.full_name
                        })
                        .select("username, full_name, avatar_url")
                        .single();

                    if (createError) {
                        console.error("Error creating profile:", createError);
                        setUser(baseUser);
                    } else {
                        const extendedUser: ExtendedUser = {
                            ...baseUser,
                            username: newProfile.username,
                            full_name: newProfile.full_name,
                            avatar_url: newProfile.avatar_url
                        };
                        setUser(extendedUser);
                    }
                } else {
                    console.error("Error fetching profile:", error);
                    setUser(baseUser);
                }
            } else {
                // Merge profile data into user object
                const extendedUser: ExtendedUser = {
                    ...baseUser,
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url
                };
                setUser(extendedUser);
            }
        } catch (error) {
            console.error("Error merging profile:", error);
            setUser(baseUser);
        }
    };

    const refreshUser = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            await fetchAndMergeProfile(currentUser);
        }
    };

    useEffect(() => {
        // Initial fetch if we have a user but no extended data yet
        if (initialUser) {
            fetchAndMergeProfile(initialUser);
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                await fetchAndMergeProfile(session.user);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <UserContext.Provider value={{ user, isLoading, refreshUser }}>
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
