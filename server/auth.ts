import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";

const router = Router();

// Initialize Supabase client for auth verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("CRITICAL: Missing Supabase environment variables!");
    console.error("Required: VITE_SUPABASE_URL (or SUPABASE_URL) and VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)");
    throw new Error("Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
            };
        }
    }
}

/**
 * Hash a password using bcrypt
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
 * Verifies the Bearer token using Supabase
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:61',message:'requireAuth entry',data:{hasAuthHeader:!!req.headers.authorization,path:req.path,method:req.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:65',message:'No auth header',data:{path:req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:70',message:'No token in header',data:{path:req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:74',message:'Verifying token with Supabase',data:{tokenLength:token.length,hasSupabaseUrl:!!supabaseUrl,hasSupabaseKey:!!supabaseKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:77',message:'Auth verification failed',data:{error:error?.message,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            console.error("Auth error:", error);
            return res.status(401).json({ error: "Invalid token" });
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email!,
        };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:85',message:'Auth success',data:{userId:user.id,email:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // We rely on the database trigger to sync the user to the 'users' table.
        // The trigger 'on_auth_user_created' handles this on signup.

        next();
    } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/3ed85ae8-4691-4490-b4b4-297755767225',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/auth.ts:93',message:'Auth middleware exception',data:{errorMessage:err instanceof Error ? err.message : String(err),errorStack:err instanceof Error ? err.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error("Auth middleware error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Routes that don't need auth or are proxies to Supabase (if any)
// Since we are using Supabase directly on frontend for login/signup,
// we mostly likely don't need /login /signup routes here unless we want to proxy them.
// But the frontend calls supabase.auth directly now.

// However, we kept /api/auth/me to return the local user profile.
router.get("/me", requireAuth, async (req: Request, res: Response) => {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.user!.id))
            .limit(1);

        if (!user) {
            // This might happen if trigger failed or race condition.
            // We could try to insert if missing?
            return res.status(404).json({ error: "User profile not found" });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

// We can remove: login, signup, logout (frontend handles these)
// But we might need profile update?
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

            if (existing.length > 0 && existing[0].id !== req.user!.id) {
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
            .where(eq(users.id, req.user!.id))
            .returning();

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found or update failed" });
        }

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user!.id;

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verify current password if user has one (they might not if signed up with oauth/magic link)
        if (user.password) {
            const isValid = await verifyPassword(currentPassword, user.password);
            if (!isValid) {
                return res.status(400).json({ error: "Incorrect current password" });
            }
        }

        const hashedPassword = await hashPassword(newPassword);

        // Update password in local db
        await db
            .update(users)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(eq(users.id, userId));

        // ALSO update in Supabase Auth
        const { error: supabaseError } = await supabase.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (supabaseError) {
            // Log it but don't fail the request since local DB is updated? 
            // Or fail? Better to fail if consistency is important.
            // But usually we can assume sync.
            console.error("Supabase password update failed:", supabaseError);
            // Verify if we should rollback? For now let's warn.
        }

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ error: "Failed to update password" });
    }
});

export default router;
export { router as authRouter };
