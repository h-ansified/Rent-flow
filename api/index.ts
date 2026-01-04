import app from '../dist/index.cjs';
// @ts-ignore
import { initPromise } from '../dist/index.cjs';

export default async (req: any, res: any) => {
    await initPromise;
    return app(req, res);
};
