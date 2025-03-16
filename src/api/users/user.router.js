import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  updatePassword,
  deleteAccount,
  getUsers,
  getUserById,
  updateAvatar,
  getUserActivity,
  searchUsers,
  toggleBlockUser,
  getBlockedUsers
} from './user.controller.js';
import {
  validateUpdateProfile,
  validateUpdatePassword,
  validateAvatar,
  validateSearch,
  validateUserId,
  validatePagination
} from './user.validation.js';
import { validate } from '../../middleware/validate.js';

const userRouter = express.Router();

userRouter.use(authenticate);

userRouter.get('/profile', getProfile);
userRouter.delete('/', deleteAccount);
userRouter.get('/activity', getUserActivity);
userRouter.get('/blocked', getBlockedUsers);
userRouter.get('/:id', validateUserId, validate, getUserById);
userRouter.get('/', validatePagination, validate, getUsers);
userRouter.put('/profile', validateUpdateProfile, validate, updateProfile);
userRouter.put('/password', validateUpdatePassword, validate, updatePassword);
userRouter.put('/avatar', validateAvatar, validate, updateAvatar);
userRouter.get('/search', validateSearch, validate, searchUsers);
userRouter.post('/block/:id', validateUserId, validate, toggleBlockUser);

export default userRouter;