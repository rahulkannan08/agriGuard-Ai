import { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, config.jwtSecret, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phoneNumber, password, area, role } = req.body;

    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      res.status(400).json({ message: 'User with this phone number already exists' });
      return;
    }

    const user = await User.create({
      fullName, email, phoneNumber, password, area, role
    });

    if (user) {
      res.status(201).json({
        message: 'Registration successful',
        user: {
          _id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          area: user.area
        },
        token: generateToken(user._id.toString(), user.role)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;

    const user = await User.findOne({ phoneNumber }) as any;

    if (user && (await user.matchPassword(password))) {
      res.json({
        message: 'Login successful',
        user: {
          _id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          area: user.area
        },
        token: generateToken(user._id.toString(), user.role)
      });
    } else {
      res.status(401).json({ message: 'Invalid phone number or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: (error as Error).message });
  }
};