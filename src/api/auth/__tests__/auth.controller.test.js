import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../../models/index.js';
import { checkAuthStatus, signup, signin, signout } from '../auth.controller.js';

// Mock the required modules
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../models/index.js');
jest.mock('../../../utils/security/generateToken.js');
jest.mock('../../../config/transporter.js');

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      body: {},
      user: null,
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
      clearCookie: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAuthStatus', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = null;
      await checkAuthStatus(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        isAuthenticated: false,
        message: 'User not authenticated',
      });
    });

    it('should return 200 with user data when authenticated', async () => {
      const mockUser = { id: 1, username: 'testuser' };
      mockReq.user = mockUser;
      await checkAuthStatus(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        isAuthenticated: true,
        user: mockUser,
      });
    });
  });

  describe('signup', () => {
    it('should return 422 when required fields are missing', async () => {
      mockReq.body = {
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
      };
      await signup(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(422);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required',
      });
    });

    it('should return 409 when email already exists', async () => {
      mockReq.body = {
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
        email: 'test@example.com',
      };
      User.findOne.mockResolvedValue({ email: 'test@example.com' });
      await signup(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists',
      });
    });
  });

  describe('signin', () => {
    it('should return 422 when email is missing', async () => {
      mockReq.body = {
        email: '',
        password: 'password123',
      };
      await signin(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(422);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Email or username is required',
      });
    });

    it('should return 401 when credentials are invalid', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      User.findOne.mockResolvedValue(null);
      await signin(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });
  });

  describe('signout', () => {
    it('should clear cookies and return success message', () => {
      signout(mockReq, mockRes);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('auth_token', expect.any(Object));
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'User signed out successfully',
      });
    });
  });
}); 