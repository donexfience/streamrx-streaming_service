import { NextFunction, Request, Response } from "express";

export class StreamController {
  constructor() {}
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
    } catch (error) {
      next(error);
    }
  };
}
