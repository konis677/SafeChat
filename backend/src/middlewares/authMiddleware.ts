import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production') as any;
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user) {
        res.status(401).json({ error: 'Invalid token: User not found' });
        return;
      }
      
      req.user = user;
      next();
    } catch (err) {
      res.status(403).json({ error: 'Forbidden: Invalid token' });
      return;
    }
  } else {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }
};
