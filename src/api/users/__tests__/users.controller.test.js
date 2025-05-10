import { jest } from '@jest/globals';
import { User } from '../../../models/index.js';
import bcrypt from 'bcryptjs';

// Mock the required modules
jest.mock('../../../models/index.js');
jest.mock('bcryptjs');

describe('Users Controller', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      body: {},
      params: {},
      user: { _id: 'user123' },
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return 404 when user not found', async () => {
      mockReq.params.userId = 'nonexistent';
      User.findById.mockResolvedValue(null);
      await getUserProfile(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      mockReq.params.userId = 'user123';
      User.findById.mockResolvedValue(mockUser);

      await getUserProfile(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });
  });

  describe('updateUserProfile', () => {
    it('should return 404 when user not found', async () => {
      mockReq.params.userId = 'nonexistent';
      User.findById.mockResolvedValue(null);
      await updateUserProfile(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 403 when user is not authorized', async () => {
      const mockUser = {
        _id: 'other123',
        username: 'otheruser',
      };
      mockReq.params.userId = 'other123';
      User.findById.mockResolvedValue(mockUser);
      await updateUserProfile(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this profile',
      });
    });

    it('should update user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };
      mockReq.params.userId = 'user123';
      mockReq.body = { username: 'updateduser' };
      User.findById.mockResolvedValue(mockUser);
      User.findByIdAndUpdate.mockResolvedValue({
        ...mockUser,
        username: 'updateduser',
      });

      await updateUserProfile(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        user: expect.objectContaining({
          username: 'updateduser',
        }),
      });
    });
  });

  describe('updatePassword', () => {
    it('should return 400 when required fields are missing', async () => {
      mockReq.body = {
        currentPassword: '',
        newPassword: '',
      };
      await updatePassword(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Current password and new password are required',
      });
    });

    it('should return 404 when user not found', async () => {
      mockReq.body = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
      };
      User.findById.mockResolvedValue(null);
      await updatePassword(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 401 when current password is incorrect', async () => {
      const mockUser = {
        _id: 'user123',
        password: 'hashedpassword',
      };
      mockReq.body = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass',
      };
      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      await updatePassword(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Current password is incorrect',
      });
    });

    it('should update password successfully', async () => {
      const mockUser = {
        _id: 'user123',
        password: 'hashedpassword',
      };
      mockReq.body = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
      };
      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('newhashedpassword');
      User.findByIdAndUpdate.mockResolvedValue({
        ...mockUser,
        password: 'newhashedpassword',
      });

      await updatePassword(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Password updated successfully',
      });
    });
  });

  describe('deleteAccount', () => {
    it('should return 404 when user not found', async () => {
      User.findById.mockResolvedValue(null);
      await deleteAccount(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should delete account successfully', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
      };
      User.findById.mockResolvedValue(mockUser);
      User.findByIdAndDelete.mockResolvedValue(mockUser);

      await deleteAccount(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully',
      });
    });
  });

  describe('searchUsers', () => {
    it('should return 400 when search query is missing', async () => {
      mockReq.query = {};
      await searchUsers(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required',
      });
    });

    it('should return search results successfully', async () => {
      const mockUsers = [
        { username: 'user1', email: 'user1@example.com' },
        { username: 'user2', email: 'user2@example.com' },
      ];
      mockReq.query = { q: 'user' };
      User.find.mockResolvedValue(mockUsers);

      await searchUsers(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        users: mockUsers,
      });
    });
  });
}); 