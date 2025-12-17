import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface AuthResponse {
    user: User;
}

/**
 * Custom hook for authentication
 * Provides user state and authentication methods
 */
export function useAuth() {
    const queryClient = useQueryClient();
    const [_, setLocation] = useLocation();

    // Fetch current user
    const { data, isLoading, error } = useQuery<AuthResponse | null>({
        queryKey: ["auth"],
        queryFn: async () => {
            const response = await fetch("/api/auth/me");
            if (!response.ok) {
                if (response.status === 401) {
                    return null; // Not authenticated
                }
                throw new Error("Failed to fetch user");
            }
            return response.json();
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Login failed");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth"] });
        },
    });

    // Signup mutation
    const signupMutation = useMutation({
        mutationFn: async (userData: { username: string; email: string; password: string }) => {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Signup failed");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["auth"] });
        },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error("Logout failed");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.setQueryData(["auth"], null);
            setLocation("/login");
        },
    });

    return {
        user: data?.user,
        isLoading,
        isAuthenticated: !!data?.user,
        error,
        login: loginMutation.mutateAsync,
        signup: signupMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
        isSigningUp: signupMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
    };
}
