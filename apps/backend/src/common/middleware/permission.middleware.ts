import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PermissionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as any;

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Use id instead of userId
    const userId = user.id;
    const permissions: string[] = user.permissions || [];

    // TODO: Add permission checking logic here
    (req as any).userId = userId;
    (req as any).permissions = permissions;

    next();
  }
}
