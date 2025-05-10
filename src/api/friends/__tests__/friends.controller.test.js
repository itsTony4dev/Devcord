import { jest } from '@jest/globals';
import { User, Friend } from '../../../models/index.js';

// Mock the required modules
jest.mock('../../../models/index.js');

describe('Friends Controller', () => {
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

  describe('sendFriendRequest', () => {
    it('should return 400 when friendId is missing', async () => {
      mockReq.body = {};
      await sendFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Friend ID is required',
      });
    });

    it('should return 404 when friend user not found', async () => {
      mockReq.body = { friendId: 'nonexistent' };
      User.findById.mockResolvedValue(null);
      await sendFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 400 when trying to send request to self', async () => {
      mockReq.body = { friendId: 'user123' };
      await sendFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot send friend request to yourself',
      });
    });

    it('should send friend request successfully', async () => {
      const mockFriend = { _id: 'friend123', username: 'frienduser' };
      mockReq.body = { friendId: 'friend123' };
      User.findById.mockResolvedValue(mockFriend);
      Friend.create.mockResolvedValue({
        sender: 'user123',
        receiver: 'friend123',
        status: 'pending',
      });

      await sendFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Friend request sent successfully',
      });
    });
  });

  describe('acceptFriendRequest', () => {
    it('should return 404 when friend request not found', async () => {
      mockReq.params.requestId = 'nonexistent';
      Friend.findById.mockResolvedValue(null);
      await acceptFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Friend request not found',
      });
    });

    it('should accept friend request successfully', async () => {
      const mockRequest = {
        _id: 'request123',
        sender: 'friend123',
        receiver: 'user123',
        status: 'pending',
      };
      mockReq.params.requestId = 'request123';
      Friend.findById.mockResolvedValue(mockRequest);
      Friend.findByIdAndUpdate.mockResolvedValue({
        ...mockRequest,
        status: 'accepted',
      });

      await acceptFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Friend request accepted',
      });
    });
  });

  describe('rejectFriendRequest', () => {
    it('should return 404 when friend request not found', async () => {
      mockReq.params.requestId = 'nonexistent';
      Friend.findById.mockResolvedValue(null);
      await rejectFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Friend request not found',
      });
    });

    it('should reject friend request successfully', async () => {
      const mockRequest = {
        _id: 'request123',
        sender: 'friend123',
        receiver: 'user123',
        status: 'pending',
      };
      mockReq.params.requestId = 'request123';
      Friend.findById.mockResolvedValue(mockRequest);
      Friend.findByIdAndDelete.mockResolvedValue(mockRequest);

      await rejectFriendRequest(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Friend request rejected',
      });
    });
  });

  describe('getFriends', () => {
    it('should return all friends successfully', async () => {
      const mockFriends = [
        { _id: 'friend1', username: 'friend1' },
        { _id: 'friend2', username: 'friend2' },
      ];
      Friend.find.mockResolvedValue(mockFriends);

      await getFriends(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        friends: mockFriends,
      });
    });
  });

  describe('getPendingRequests', () => {
    it('should return pending friend requests successfully', async () => {
      const mockRequests = [
        { _id: 'request1', sender: 'user1', status: 'pending' },
        { _id: 'request2', sender: 'user2', status: 'pending' },
      ];
      Friend.find.mockResolvedValue(mockRequests);

      await getPendingRequests(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        requests: mockRequests,
      });
    });
  });

  describe('removeFriend', () => {
    it('should return 404 when friendship not found', async () => {
      mockReq.params.friendId = 'nonexistent';
      Friend.findOne.mockResolvedValue(null);
      await removeFriend(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Friendship not found',
      });
    });

    it('should remove friend successfully', async () => {
      const mockFriendship = {
        _id: 'friendship123',
        users: ['user123', 'friend123'],
      };
      mockReq.params.friendId = 'friend123';
      Friend.findOne.mockResolvedValue(mockFriendship);
      Friend.findByIdAndDelete.mockResolvedValue(mockFriendship);

      await removeFriend(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Friend removed successfully',
      });
    });
  });
}); 