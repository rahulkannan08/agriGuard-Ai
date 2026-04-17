import { Request, Response } from 'express';
import { CROP_DISEASES } from '../lib/constants';

export function cropsController(req: Request, res: Response) {
  res.status(200).json({
    success: true,
    crops: CROP_DISEASES,
    total: CROP_DISEASES.length,
  });
}
