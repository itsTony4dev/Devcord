import { jest } from '@jest/globals';
import { Message } from '../../../models/index.js';

// Mock the required modules
jest.mock('../../../models/index.js');

describe('Messages Controller', () => {
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
      user: null,
    };
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should return 400 when message content is missing', async () => {
      mockReq.body = {
        content: '',
        channelId: 'channel123',
      };
      await sendMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Message content is required',
      });
    });

    it('should send message successfully', async () => {
      const mockMessage = {
        content: 'Hello, world!',
        channelId: 'channel123',
        sender: 'user123',
      };
      mockReq.body = mockMessage;
      mockReq.user = { _id: 'user123' };
      
      Message.create.mockResolvedValue(mockMessage);
      
      await sendMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Message sent successfully',
        data: mockMessage,
      });
    });
  });

  describe('getMessages', () => {
    it('should return messages for a channel', async () => {
      const mockMessages = [
        { content: 'Message 1', channelId: 'channel123' },
        { content: 'Message 2', channelId: 'channel123' },
      ];
      mockReq.params.channelId = 'channel123';
      
      Message.find.mockResolvedValue(mockMessages);
      
      await getMessages(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        messages: mockMessages,
      });
    });
  });

  describe('updateMessage', () => {
    it('should return 404 when message is not found', async () => {
      mockReq.params.messageId = 'nonexistent';
      Message.findByIdAndUpdate.mockResolvedValue(null);
      
      await updateMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Message not found',
      });
    });

    it('should update message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        content: 'Updated message',
        channelId: 'channel123',
      };
      mockReq.params.messageId = 'message123';
      mockReq.body = { content: 'Updated message' };
      Message.findByIdAndUpdate.mockResolvedValue(mockMessage);
      
      await updateMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Message updated successfully',
        data: mockMessage,
      });
    });
  });

  describe('deleteMessage', () => {
    it('should return 404 when message is not found', async () => {
      mockReq.params.messageId = 'nonexistent';
      Message.findByIdAndDelete.mockResolvedValue(null);
      
      await deleteMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Message not found',
      });
    });

    it('should delete message successfully', async () => {
      const mockMessage = {
        _id: 'message123',
        content: 'Test message',
      };
      mockReq.params.messageId = 'message123';
      Message.findByIdAndDelete.mockResolvedValue(mockMessage);
      
      await deleteMessage(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Message deleted successfully',
      });
    });
  });
}); 