import { Request, Response } from 'express';
export declare class VisitorController {
    list(req: Request, res: Response): Promise<void>;
    create(req: Request, res: Response): Promise<void>;
    registerEntry(req: Request, res: Response): Promise<void>;
    registerExit(req: Request, res: Response): Promise<void>;
    authorize(req: Request, res: Response): Promise<void>;
    findById(req: Request, res: Response): Promise<void>;
    historyByUnit(req: Request, res: Response): Promise<void>;
}
export declare const visitorController: VisitorController;
//# sourceMappingURL=visitor.controller.d.ts.map