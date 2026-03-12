import { Request, Response } from 'express';
export declare class AssemblyController {
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    vote(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    registerAttendance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getResults(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const assemblyController: AssemblyController;
//# sourceMappingURL=assembly.controller.d.ts.map