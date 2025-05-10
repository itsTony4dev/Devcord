import { jest } from '@jest/globals';
import { Channel } from '../../../models/index.js';

// Mock the required modules
jest.mock('../../../models/index.js');

describe('Channels Controller', () => {
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

  describe('createChannel', () => {
    it('should return 400 when required fields are missing', async () => {
      mockReq.body = {
        name: '',
        description: '',
      };
      await createChannel(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Channel name is required',
      });
    });

    it('should create a channel successfully', async () => {
      const mockChannel = {
        name: 'test-channel',
        description: 'Test channel description',
        createdBy: 'user123',
      };
      mockReq.body = mockChannel;
      mockReq.user = { _id: 'user123' };
      
      Channel.create.mockResolvedValue(mockChannel);
      
      await createChannel(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Channel created successfully',
        channel: mockChannel,
      });
    });
  });

  describe('getChannels', () => {
    it('should return all channels', async () => {
      const mockChannels = [
        { name: 'channel1', description: 'Description 1' },
        { name: 'channel2', description: 'Description 2' },
      ];
      
      Channel.find.mockResolvedValue(mockChannels);
      
      await getChannels(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        channels: mockChannels,
      });
    });
  });

  describe('updateChannel', () => {
    it('should return 404 when channel is not found', async () => {
      mockReq.params.channelId = 'nonexistent';
      Channel.findByIdAndUpdate.mockResolvedValue(null);
      
      await updateChannel(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Channel not found',
      });
    });

    it('should update channel successfully', async () => {
      const mockChannel = {
        _id: 'channel123',
        name: 'updated-channel',
        description: 'Updated description',
      };
      mockReq.params.channelId = 'channel123';
      mockReq.body = { name: 'updated-channel', description: 'Updated description' };
      Channel.findByIdAndUpdate.mockResolvedValue(mockChannel);
      
      await updateChannel(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Channel updated successfully',
        channel: mockChannel,
      });
    });
  });

  describe('deleteChannel', () => {
    it('should return 404 when channel is not found', async () => {
      mockReq.params.channelId = 'nonexistent';
      Channel.findByIdAndDelete.mockResolvedValue(null);
      
      await deleteChannel(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Channel not found',
      });
    });

    it('should delete channel successfully', async () => {
      const mockChannel = {
        _id: 'channel123',
        name: 'test-channel',
      };
      mockReq.params.channelId = 'channel123';
      Channel.findByIdAndDelete.mockResolvedValue(mockChannel);
      
      await deleteChannel(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Channel deleted successfully',
      });
    });
  });
}); 