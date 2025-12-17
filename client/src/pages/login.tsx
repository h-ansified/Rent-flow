import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Mail, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
    const [_, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();

    const { register, handleSubmit, formState: { errors }, setValue } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    // Auto-fill demo credentials
    const handleTryDemo = () => {
        setValue("email", "demo@rentflow.app");
        setValue("password", "Demo123!");
    };

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    rememberMe: data.rememberMe || false,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Login failed");
                return;
            }

            toast({
                title: "Welcome back!",
                description: `Logged in as ${result.user.email}`,
            });

            setLocation("/");
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        RentFlow
                    </h1>
                    <p className="text-muted-foreground">Property Management Made Simple</p>
                </div>

                {/* Demo Account Card */}
                <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            <CardTitle className="text-sm">Try the Demo Account</CardTitle>
                        </div>
                        <CardDescription>
                            Explore all features with pre-loaded sample data
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-mono bg-background/50 rounded p-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">demo@rentflow.app</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-mono bg-background/50 rounded p-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground">Demo123!</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleTryDemo}
                            type="button"
                        >
                            Fill Demo Credentials
                        </Button>
                        <Button
                            variant="default"
                            className="w-full"
                            onClick={() => onSubmit({ email: "demo@rentflow.app", password: "Demo123!", rememberMe: true })}
                            type="button"
                        >
                            Launch Demo Now
                        </Button>
                    </CardFooter>
                </Card>

                {/* Login Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sign In</CardTitle>
                        <CardDescription>Enter your credentials to access your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    {...register("email")}
                                    disabled={isLoading}
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register("password")}
                                    disabled={isLoading}
                                />
                                {errors.password && (
                                    <p className="text-sm text-destructive">{errors.password.message}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <input
                                        id="rememberMe"
                                        type="checkbox"
                                        {...register("rememberMe")}
                                        disabled={isLoading}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label
                                        htmlFor="rememberMe"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Remember me
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLocation("/forgot-password")}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Signing in..." : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <button
                                onClick={() => setLocation("/signup")}
                                className="text-primary hover:underline font-medium"
                                type="button"
                            >
                                Sign up
                            </button>
                        </div>
                    </CardFooter>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}
