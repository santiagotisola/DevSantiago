import { Request, Response } from 'express';
export declare class PetController {
    list(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    listByUnit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    create(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    update(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    delete(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const petController: PetController;
//# sourceMappingURL=pet.controller.d.ts.map