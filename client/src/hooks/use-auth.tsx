import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    loginMutation: {
        mutateAsync: (credentials: any) => Promise<void>;
        isPending: boolean;
    };
    logoutMutation: {
        mutate: () => void;
    };
    logout: () => void;
    registerMutation: {
        mutateAsync: (credentials: any) => Promise<void>;
        isPending: boolean;
    };
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoginPending, setIsLoginPending] = useState(false);
    const [isRegisterPending, setIsRegisterPending] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession()
            .then(({ data: { session }, error }) => {
                if (error) {
                    console.error("Error getting session:", error);
                    setIsLoading(false);
                    return;
                }
                if (session?.user) {
                    const metadata = session.user.user_metadata;
                    setUser({
                        id: session.user.id,
                        email: session.user.email!,
                        username: metadata.username || session.user.email!.split('@')[0],
                        // Defaults for required fields
                        password: "",
                        firstName: metadata.firstName || null,
                        lastName: metadata.lastName || null,
                        phone: metadata.phone || null,
                        companyName: metadata.companyName || null,
                        businessEmail: metadata.businessEmail || null,
                        businessAddress: metadata.businessAddress || null,
                        currency: metadata.currency || "KES",
                        profilePhotoUrl: metadata.profilePhotoUrl || null,
                        createdAt: new Date(session.user.created_at),
                        updatedAt: new Date(session.user.updated_at || new Date()),
                    } as User);
                }
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Failed to get session:", error);
                setIsLoading(false);
            });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const metadata = session.user.user_metadata;
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    username: metadata.username || session.user.email!.split('@')[0],
                    password: "",
                    firstName: metadata.firstName || null,
                    lastName: metadata.lastName || null,
                    phone: metadata.phone || null,
                    companyName: metadata.companyName || null,
                    businessEmail: metadata.businessEmail || null,
                    businessAddress: metadata.businessAddress || null,
                    currency: metadata.currency || "KES",
                    profilePhotoUrl: metadata.profilePhotoUrl || null,
                    createdAt: new Date(session.user.created_at),
                    updatedAt: new Date(session.user.updated_at || new Date()),
                } as User);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loginMutation = {
        isPending: isLoginPending,
        mutateAsync: async ({ email, password }: any) => {
            setIsLoginPending(true);
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast({ title: "Welcome back!" });
            } catch (error: any) {
                toast({
                    title: "Login failed",
                    description: error.message,
                    variant: "destructive",
                });
                throw error;
            } finally {
                setIsLoginPending(false);
            }
        },
    };

    const registerMutation = {
        isPending: isRegisterPending,
        mutateAsync: async ({ email, password, username, role }: any) => {
            setIsRegisterPending(true);
            try {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                            role: role || 'tenant' // Default role
                        },
                    },
                });
                if (error) throw error;
                toast({ title: "Registration successful", description: "Please check your email to verify your account" });
            } catch (error: any) {
                toast({
                    title: "Registration failed",
                    description: error.message,
                    variant: "destructive",
                });
                throw error;
            } finally {
                setIsRegisterPending(false);
            }
        },
    };

    const logoutMutation = {
        mutate: async () => {
            await supabase.auth.signOut();
            toast({ title: "Logged out" });
        },
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                error: null,
                loginMutation,
                logoutMutation,
                logout: logoutMutation.mutate,
                registerMutation,
            }
            }
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
