// Vercel serverless function handler for Express app
let appInstance: any = null;
let initPromise: Promise<void> | null = null;
let isInitializing = false;

async function getApp() {
    // If app is already initialized, return it
    if (appInstance && initPromise) {
        try {
            await initPromise;
            return appInstance;
        } catch (error) {
            // If initialization failed, reset and try again
            console.error('Previous initialization failed, retrying...', error);
            appInstance = null;
            initPromise = null;
        }
    }

    // Prevent concurrent initializations
    if (isInitializing) {
        // Wait for the ongoing initialization
        while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (appInstance && initPromise) {
            await initPromise;
            return appInstance;
        }
    }

    isInitializing = true;

    try {
        console.log('Initializing serverless function...');
        
        // Import the app and initialization promise
        const module = await import('../dist/index.cjs');
        appInstance = module.default;
        initPromise = module.initPromise;

        // Wait for initialization to complete with timeout
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout after 10 seconds')), 10000)
        );
        
        await Promise.race([initPromise, timeout]);
        
        console.log('Serverless function initialized successfully');
        return appInstance;
    } catch (error) {
        console.error('Failed to import or initialize app:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('Error details:', { errorMessage, errorStack });
        
        // Reset state on error
        appInstance = null;
        initPromise = null;
        throw error;
    } finally {
        isInitializing = false;
    }
}

export default async (req: any, res: any) => {
    try {
        const app = await getApp();
        
        // Handle the request with Express app
        // Vercel passes (req, res) directly to Express
        return app(req, res);
    } catch (error) {
        console.error('Serverless function error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        // Log full error details for debugging
        console.error('Full error:', {
            message: errorMessage,
            stack: errorStack,
            env: {
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                hasSupabaseUrl: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
                hasSupabaseKey: !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
            }
        });
        
        // Return a proper error response
        if (!res.headersSent) {
            res.status(500).json({
                error: 'A server error has occurred',
                message: errorMessage,
                details: process.env.NODE_ENV === 'development' ? errorStack : undefined
            });
        }
    }
};
