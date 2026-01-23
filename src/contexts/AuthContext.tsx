import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { ensureProfileAndBackfillXp } from "@/lib/profile";

interface AuthState {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
}

interface AuthContextType extends AuthState {
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [authState, setAuthState] = useState<AuthState>({
        session: null,
        user: null,
        loading: true,
        isAdmin: false,
    });

    useEffect(() => {
        let mounted = true;

        const hydrateExtendedData = async (user: User) => {
            try {
                console.log("Starting background hydration for user:", user.id);
                const [profileResult, roleResult] = await Promise.all([
                    ensureProfileAndBackfillXp(user).catch(e => {
                        console.error("Background profile check failed:", e);
                        return null;
                    }),
                    supabase
                        .from("user_roles")
                        .select("role")
                        .eq("user_id", user.id)
                        .maybeSingle()
                ]);

                if (mounted) {
                    setAuthState(prev => ({
                        ...prev,
                        isAdmin: roleResult?.data?.role === "admin",
                    }));
                }
            } catch (error) {
                console.error("Background hydration error:", error);
            }
        };

        const handleAuthStateChange = (session: Session | null) => {
            const user = session?.user ?? null;

            if (mounted) {
                setAuthState(prev => ({
                    ...prev,
                    session,
                    user,
                    loading: false,
                    isAdmin: prev.user?.id === user?.id ? prev.isAdmin : false,
                }));
            }

            if (user) {
                hydrateExtendedData(user);
            }
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`Auth event: ${event}`);
            if (event === 'SIGNED_OUT') {
                if (mounted) setAuthState({ session: null, user: null, isAdmin: false, loading: false });
            } else {
                handleAuthStateChange(session);
            }
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthStateChange(session);
        }).catch(err => {
            console.error("getSession error:", err);
            if (mounted) setAuthState(prev => ({ ...prev, loading: false }));
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ ...authState, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
};
