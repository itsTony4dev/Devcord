import { jest } from '@jest/globals';
import { Workspace, User } from '../../../models/index.js';

// Mock the required modules
jest.mock('../../../models/index.js');

describe('Workspaces Controller', () => {
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

  describe('createWorkspace', () => {
    it('should return 400 when required fields are missing', async () => {
      mockReq.body = {
        name: '',
        description: '',
      };
      await createWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Workspace name is required',
      });
    });

    it('should create workspace successfully', async () => {
      const mockWorkspace = {
        name: 'Test Workspace',
        description: 'Test Description',
        owner: 'user123',
        members: ['user123'],
      };
      mockReq.body = {
        name: 'Test Workspace',
        description: 'Test Description',
      };
      Workspace.create.mockResolvedValue(mockWorkspace);

      await createWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workspace created successfully',
        workspace: mockWorkspace,
      });
    });
  });

  describe('getWorkspaces', () => {
    it('should return user workspaces successfully', async () => {
      const mockWorkspaces = [
        { name: 'Workspace 1', owner: 'user123' },
        { name: 'Workspace 2', owner: 'user123' },
      ];
      Workspace.find.mockResolvedValue(mockWorkspaces);

      await getWorkspaces(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        workspaces: mockWorkspaces,
      });
    });
  });

  describe('getWorkspaceById', () => {
    it('should return 404 when workspace not found', async () => {
      mockReq.params.workspaceId = 'nonexistent';
      Workspace.findById.mockResolvedValue(null);
      await getWorkspaceById(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Workspace not found',
      });
    });

    it('should return workspace successfully', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        name: 'Test Workspace',
        owner: 'user123',
      };
      mockReq.params.workspaceId = 'workspace123';
      Workspace.findById.mockResolvedValue(mockWorkspace);

      await getWorkspaceById(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        workspace: mockWorkspace,
      });
    });
  });

  describe('updateWorkspace', () => {
    it('should return 404 when workspace not found', async () => {
      mockReq.params.workspaceId = 'nonexistent';
      Workspace.findById.mockResolvedValue(null);
      await updateWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Workspace not found',
      });
    });

    it('should return 403 when user is not the owner', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        name: 'Test Workspace',
        owner: 'other123',
      };
      mockReq.params.workspaceId = 'workspace123';
      Workspace.findById.mockResolvedValue(mockWorkspace);
      await updateWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this workspace',
      });
    });

    it('should update workspace successfully', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        name: 'Updated Workspace',
        owner: 'user123',
      };
      mockReq.params.workspaceId = 'workspace123';
      mockReq.body = { name: 'Updated Workspace' };
      Workspace.findById.mockResolvedValue(mockWorkspace);
      Workspace.findByIdAndUpdate.mockResolvedValue(mockWorkspace);

      await updateWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workspace updated successfully',
        workspace: mockWorkspace,
      });
    });
  });

  describe('deleteWorkspace', () => {
    it('should return 404 when workspace not found', async () => {
      mockReq.params.workspaceId = 'nonexistent';
      Workspace.findById.mockResolvedValue(null);
      await deleteWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Workspace not found',
      });
    });

    it('should return 403 when user is not the owner', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        name: 'Test Workspace',
        owner: 'other123',
      };
      mockReq.params.workspaceId = 'workspace123';
      Workspace.findById.mockResolvedValue(mockWorkspace);
      await deleteWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to delete this workspace',
      });
    });

    it('should delete workspace successfully', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        name: 'Test Workspace',
        owner: 'user123',
      };
      mockReq.params.workspaceId = 'workspace123';
      Workspace.findById.mockResolvedValue(mockWorkspace);
      Workspace.findByIdAndDelete.mockResolvedValue(mockWorkspace);

      await deleteWorkspace(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workspace deleted successfully',
      });
    });
  });

  describe('addMember', () => {
    it('should return 404 when workspace not found', async () => {
      mockReq.params.workspaceId = 'nonexistent';
      Workspace.findById.mockResolvedValue(null);
      await addMember(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Workspace not found',
      });
    });

    it('should return 404 when user not found', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        owner: 'user123',
      };
      mockReq.params.workspaceId = 'workspace123';
      mockReq.body = { userId: 'nonexistent' };
      Workspace.findById.mockResolvedValue(mockWorkspace);
      User.findById.mockResolvedValue(null);
      await addMember(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should add member successfully', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        owner: 'user123',
        members: ['user123'],
      };
      const mockUser = {
        _id: 'newuser123',
        username: 'newuser',
      };
      mockReq.params.workspaceId = 'workspace123';
      mockReq.body = { userId: 'newuser123' };
      Workspace.findById.mockResolvedValue(mockWorkspace);
      User.findById.mockResolvedValue(mockUser);
      Workspace.findByIdAndUpdate.mockResolvedValue({
        ...mockWorkspace,
        members: [...mockWorkspace.members, 'newuser123'],
      });

      await addMember(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Member added successfully',
      });
    });
  });

  describe('removeMember', () => {
    it('should return 404 when workspace not found', async () => {
      mockReq.params.workspaceId = 'nonexistent';
      Workspace.findById.mockResolvedValue(null);
      await removeMember(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Workspace not found',
      });
    });

    it('should return 400 when trying to remove owner', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        owner: 'user123',
        members: ['user123'],
      };
      mockReq.params.workspaceId = 'workspace123';
      mockReq.body = { userId: 'user123' };
      Workspace.findById.mockResolvedValue(mockWorkspace);
      await removeMember(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot remove workspace owner',
      });
    });

    it('should remove member successfully', async () => {
      const mockWorkspace = {
        _id: 'workspace123',
        owner: 'user123',
        members: ['user123', 'member123'],
      };
      mockReq.params.workspaceId = 'workspace123';
      mockReq.body = { userId: 'member123' };
      Workspace.findById.mockResolvedValue(mockWorkspace);
      Workspace.findByIdAndUpdate.mockResolvedValue({
        ...mockWorkspace,
        members: ['user123'],
      });

      await removeMember(mockReq, mockRes);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Member removed successfully',
      });
    });
  });
}); 