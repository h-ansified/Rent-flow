import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Building2,
    Users,
    CreditCard,
    Wrench,
    BarChart3,
    ArrowRight,
    CheckCircle2,
    Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Welcome() {
    const [_, setLocation] = useLocation();
    const { user } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!user) {
            setLocation("/login");
        }
    }, [user, setLocation]);

    const handleGetStarted = () => {
        setLocation("/");
    };

    const features = [
        {
            icon: Building2,
            title: "Manage Properties",
            description: "Add and track all your rental properties in one place",
        },
        {
            icon: Users,
            title: "Track Tenants",
            description: "Keep detailed records of tenants and lease agreements",
        },
        {
            icon: CreditCard,
            title: "Monitor Payments",
            description: "Track rent payments, due dates, and payment history",
        },
        {
            icon: Wrench,
            title: "Maintenance Requests",
            description: "Manage and prioritize property maintenance efficiently",
        },
        {
            icon: BarChart3,
            title: "Financial Insights",
            description: "View revenue, expenses, and occupancy analytics",
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <div className="w-full max-w-4xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Welcome to RentFlow!
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        {user?.username ? `Hi ${user.username}! ` : ""}
                        Your property management journey starts here. Let's explore what you can do.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <feature.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{feature.description}</CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Start Tips */}
                <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Quick Start Tips
                        </CardTitle>
                        <CardDescription>Get the most out of RentFlow</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                1
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Add your first property</span> - Start by adding properties you manage
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                2
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Register your tenants</span> - Add tenant details and lease information
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                3
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Track payments</span> - Record rent payments to monitor cash flow
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA */}
                <div className="flex justify-center">
                    <Button
                        size="lg"
                        onClick={handleGetStarted}
                        className="gap-2 px-8"
                    >
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    Need help? Visit the <button
                        onClick={() => setLocation("/help")}
                        className="text-primary hover:underline font-medium"
                    >
                        Help Center
                    </button>
                </p>
            </div>
        </div>
    );
}
