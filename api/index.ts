import app from '../server/index';
// @ts-ignore
import { initPromise } from '../server/index';

export default async (req: any, res: any) => {
    await initPromise;
    return app(req, res);
};
