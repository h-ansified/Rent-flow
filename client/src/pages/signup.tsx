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
import { Info, Mail, Lock, AlertCircle, User, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
    const [_, setLocation] = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { toast } = useToast();

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<SignupForm>({
        resolver: zodResolver(signupSchema),
        mode: "onChange",
    });

    const password = watch("password", "");

    // Password strength indicators
    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };

    // Auto-fill demo credentials
    const handleTryDemo = () => {
        setLocation("/login");
    };

    const onSubmit = async (data: SignupForm) => {
        setIsLoading(true);
        setError("");

        try {
            const { confirmPassword, ...signupData } = data;
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(signupData),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || result.details?.[0]?.message || "Signup failed");
                return;
            }

            toast({
                title: "Account created!",
                description: "Welcome to RentFlow. Let's get you started...",
            });

            setTimeout(() => setLocation("/welcome"), 1000);
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
                            <CardTitle className="text-sm">Explore with Demo Account</CardTitle>
                        </div>
                        <CardDescription>
                            See RentFlow in action with pre-loaded sample data
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
                    <CardFooter>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleTryDemo}
                            type="button"
                        >
                            Go to Login with Demo
                        </Button>
                    </CardFooter>
                </Card>

                {/* Signup Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create Account</CardTitle>
                        <CardDescription>Sign up to start managing your properties</CardDescription>
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
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="johndoe"
                                    {...register("username")}
                                    disabled={isLoading}
                                />
                                {errors.username && (
                                    <p className="text-sm text-destructive">{String(errors.username.message)}</p>
                                )}
                            </div>

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
                                    <p className="text-sm text-destructive">{String(errors.email.message)}</p>
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
                                {password && (
                                    <div className="space-y-1 mt-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            {passwordChecks.length ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <span className={cn(passwordChecks.length ? "text-green-600" : "text-muted-foreground")}>
                                                At least 8 characters
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {passwordChecks.uppercase ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <span className={cn(passwordChecks.uppercase ? "text-green-600" : "text-muted-foreground")}>
                                                One uppercase letter
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {passwordChecks.lowercase ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <span className={cn(passwordChecks.lowercase ? "text-green-600" : "text-muted-foreground")}>
                                                One lowercase letter
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {passwordChecks.number ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <span className={cn(passwordChecks.number ? "text-green-600" : "text-muted-foreground")}>
                                                One number
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {errors.password && (
                                    <p className="text-sm text-destructive">{String(errors.password.message)}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    {...register("confirmPassword")}
                                    disabled={isLoading}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{String(errors.confirmPassword.message)}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Creating account..." : "Create Account"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <button
                                onClick={() => setLocation("/login")}
                                className="text-primary hover:underline font-medium"
                                type="button"
                            >
                                Sign in
                            </button>
                        </div>
                    </CardFooter>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}
