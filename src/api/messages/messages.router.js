import { Router } from 'express';

import { getMessages, createMessage } from './messages.controller.js';
import { validateMessage } from './messages.middleware.js';

const messagesRouter = Router();






export default messagesRouter;

