import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const MONGODB_URI = 'mongodb://localhost:27017/your_database';
const JWT_SECRET = 'your_jwt_secret';

// Connect to MongoDB
mongoose.connect(MONGODB_URI);

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  email: string;
}

export const login = async (credentials: LoginCredentials) => {
  const user = await User.findOne({ username: credentials.username });
  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await bcrypt.compare(credentials.password, user.password);
  if (!isValid) {
    throw new Error('Invalid password');
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
  localStorage.setItem('token', token);
  localStorage.setItem('isAuthenticated', 'true');

  return { token, user: { username: user.username, email: user.email } };
};

export const register = async (credentials: RegisterCredentials) => {
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { username: credentials.username },
      { email: credentials.email }
    ]
  });

  if (existingUser) {
    throw new Error('Username or email already exists');
  }

  // Create new user
  const user = new User(credentials);
  await user.save();

  // Generate token
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
  localStorage.setItem('token', token);
  localStorage.setItem('isAuthenticated', 'true');

  return { token, user: { username: user.username, email: user.email } };
};