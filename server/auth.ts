import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, insertUserSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Extend Express Request type to include session user
declare module "express-session" {
    interface SessionData {
        userId: string;
        email: string;
    }
}

/**
 * Hash a password using bcrypt with 10 salt rounds (as per security requirements)
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Email validation (regex pattern)
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Middleware to require authentication on routes
 * Returns 401 if user is not logged in
 */
export function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post("/signup", async (req: Request, res: Response) => {
    try {
        // Validate input
        const parsed = insertUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid input",
                details: parsed.error.errors
            });
        }

        const { username, email, password } = parsed.data;

        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // Check username
        const existingUsername = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (existingUsername.length > 0) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const [newUser] = await db
            .insert(users)
            .values({
                username,
                email,
                password: hashedPassword,
            })
            .returning();

        // Create session
        req.session.userId = newUser.id;
        req.session.email = newUser.email;

        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Failed to create account" });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", async (req: Request, res: Response) => {
    try {
        const { email, password, rememberMe } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Find user by email
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Create session with extended duration if remember me is checked
        req.session.userId = user.id;
        req.session.email = user.email;

        // If remember me, extend cookie maxAge to 30 days, otherwise use session cookie
        if (rememberMe && req.session.cookie) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

/**
 * POST /api/auth/logout
 * Logout and clear session
 */
router.post("/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
    });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.session.userId!))
            .limit(1);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

/**
 * PATCH /api/auth/profile
 * Update user profile (username, email, profile photo)
 */
router.patch("/profile", requireAuth, async (req: Request, res: Response) => {
    try {
        const {
            username,
            profilePhotoUrl,
            firstName,
            lastName,
            phone,
            companyName,
            businessEmail,
            businessAddress,
            currency
        } = req.body;

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (username) {
            // Check if username is already taken
            const existing = await db
                .select()
                .from(users)
                .where(eq(users.username, username))
                .limit(1);

            if (existing.length > 0 && existing[0].id !== req.session.userId) {
                return res.status(400).json({ error: "Username already taken" });
            }

            updateData.username = username;
        }

        if (profilePhotoUrl !== undefined) updateData.profilePhotoUrl = profilePhotoUrl;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (phone !== undefined) updateData.phone = phone;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (businessEmail !== undefined) updateData.businessEmail = businessEmail;
        if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
        if (currency !== undefined) updateData.currency = currency;

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, req.session.userId!))
            .returning();

        // Return user without password
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current and new passwords are required" });
        }

        // Validate new password strength
        const passwordSchema = z.string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number");

        const validation = passwordSchema.safeParse(newPassword);
        if (!validation.success) {
            return res.status(400).json({
                error: "Password does not meet requirements",
                details: validation.error.errors
            });
        }

        // Get current user
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.session.userId!))
            .limit(1);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Hash new password and update
        const hashedPassword = await hashPassword(newPassword);
        await db
            .update(users)
            .set({
                password: hashedPassword,
                updatedAt: new Date()
            })
            .where(eq(users.id, req.session.userId!));

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ error: "Failed to change password" });
    }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: "Valid email is required" });
        }

        // Check if user exists
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        // Always return success to prevent email enumeration
        // In production, send actual email here with reset token
        if (user) {
            // TODO: Generate reset token and send email
            // For now, we'll just log it
            console.log(`Password reset requested for: ${email}`);

            // In production:
            // 1. Generate secure random token
            // 2. Store token with expiration in database
            // 3. Send email with reset link containing token
            // 4. Example: https://yourapp.com/reset-password?token=xyz
        }

        res.json({ message: "If an account exists with that email, a reset link has been sent" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password are required" });
        }

        // Validate new password strength
        const passwordSchema = z.string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Must contain at least one uppercase letter")
            .regex(/[a-z]/, "Must contain at least one lowercase letter")
            .regex(/[0-9]/, "Must contain at least one number");

        const validation = passwordSchema.safeParse(newPassword);
        if (!validation.success) {
            return res.status(400).json({
                error: "Password does not meet requirements",
                details: validation.error.errors
            });
        }

        // TODO: Verify token and get user
        // In production:
        // 1. Look up token in database
        // 2. Check if token is expired
        // 3. Get associated user
        // 4. Delete/invalidate the token

        // For now, return error since we haven't implemented token storage
        return res.status(400).json({ error: "Password reset functionality requires email configuration" });

        // Example implementation:
        // const [resetRecord] = await db.select().from(passwordResets)
        //   .where(and(eq(passwordResets.token, token), gt(passwordResets.expiresAt, new Date())));
        // 
        // if (!resetRecord) {
        //   return res.status(400).json({ error: "Invalid or expired reset token" });
        // }
        //
        // const hashedPassword = await hashPassword(newPassword);
        // await db.update(users)
        //   .set({ password: hashedPassword })
        //   .where(eq(users.id, resetRecord.userId));
        //
        // await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));
        //
        // res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

export default router;
export { router as authRouter };
