import { jest } from '@jest/globals';
import { DirectMessage, User } from '../../../models/index.js';

// Mock the required modules
jest.mock('../../../models/index.js');

describe('Direct Messages Controller', () => {
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

  describe('sendDirectMessage', () => {
    it('should return 400 when required fields are missing', async () => {
      mockReq.body = {
        content: '',
        receiverId: '',
      };
      await sendDirectMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Message content and receiver ID are required',
      });
    });

    it('should return 404 when receiver not found', async () => {
      mockReq.body = {
        content: 'Hello',
        receiverId: 'nonexistent',
      };
      User.findById.mockResolvedValue(null);
      await sendDirectMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Receiver not found',
      });
    });

    it('should send direct message successfully', async () => {
      const mockReceiver = { _id: 'receiver123', username: 'receiver' };
      const mockMessage = {
        content: 'Hello',
        sender: 'user123',
        receiver: 'receiver123',
      };
      mockReq.body = {
        content: 'Hello',
        receiverId: 'receiver123',
      };
      User.findById.mockResolvedValue(mockReceiver);
      DirectMessage.create.mockResolvedValue(mockMessage);

      await sendDirectMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Message sent successfully',
        data: mockMessage,
      });
    });
  });

  describe('getConversation', () => {
    it('should return 404 when conversation not found', async () => {
      mockReq.params.userId = 'nonexistent';
      DirectMessage.find.mockResolvedValue([]);
      await getConversation(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'No conversation found',
      });
    });

    it('should return conversation messages successfully', async () => {
      const mockMessages = [
        { content: 'Hello', sender: 'user123', receiver: 'other123' },
        { content: 'Hi', sender: 'other123', receiver: 'user123' },
      ];
      mockReq.params.userId = 'other123';
      DirectMessage.find.mockResolvedValue(mockMessages);

      await getConversation(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        messages: mockMessages,
      });
    });
  });

  describe('getAllConversations', () => {
    it('should return all conversations successfully', async () => {
      const mockConversations = [
        { userId: 'user1', lastMessage: 'Hello' },
        { userId: 'user2', lastMessage: 'Hi' },
      ];
      DirectMessage.aggregate.mockResolvedValue(mockConversations);

      await getAllConversations(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        conversations: mockConversations,
      });
    });
  });

  describe('deleteMessage', () => {
    it('should return 404 when message not found', async () => {
      mockReq.params.messageId = 'nonexistent';
      DirectMessage.findById.mockResolvedValue(null);
      await deleteMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Message not found',
      });
    });

    it('should return 403 when user is not the sender', async () => {
      const mockMessage = {
        _id: 'message123',
        sender: 'other123',
        receiver: 'user123',
      };
      mockReq.params.messageId = 'message123';
      DirectMessage.findById.mockResolvedValue(mockMessage);
      await deleteMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to delete this message',
      });
    });

    it('should delete message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        sender: 'user123',
        receiver: 'other123',
      };
      mockReq.params.messageId = 'message123';
      DirectMessage.findById.mockResolvedValue(mockMessage);
      DirectMessage.findByIdAndDelete.mockResolvedValue(mockMessage);

      await deleteMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Message deleted successfully',
      });
    });
  });

  describe('markAsRead', () => {
    it('should return 404 when conversation not found', async () => {
      mockReq.params.userId = 'nonexistent';
      DirectMessage.updateMany.mockResolvedValue({ modifiedCount: 0 });
      await markAsRead(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'No messages found to mark as read',
      });
    });

    it('should mark messages as read successfully', async () => {
      mockReq.params.userId = 'other123';
      DirectMessage.updateMany.mockResolvedValue({ modifiedCount: 5 });

      await markAsRead(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Messages marked as read',
      });
    });
  });
}); 