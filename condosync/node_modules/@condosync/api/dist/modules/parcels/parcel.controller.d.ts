import { Request, Response } from 'express';
export declare class ParcelController {
    list(req: Request, res: Response): Promise<void>;
    register(req: Request, res: Response): Promise<void>;
    confirmPickup(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
    cancel(req: Request, res: Response): Promise<void>;
    findById(req: Request, res: Response): Promise<void>;
    pendingByUnit(req: Request, res: Response): Promise<void>;
}
export declare const parcelController: ParcelController;
//# sourceMappingURL=parcel.controller.d.ts.map