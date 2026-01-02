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
