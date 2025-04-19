import { handleHelpCommand } from './handlers/help.handler.js';
import { handleAICommand } from './handlers/ai.handler.js';
import { handleStackOverflowCommand } from './handlers/stackoverflow.handler.js';

/**
 * Command Handler
 * Processes and routes chat commands
 */

// Command prefix
const COMMAND_PREFIX = '/';

// Available commands mapping
const COMMANDS = {
    'help': handleHelpCommand,
    'ai': handleAICommand,
    'sof': handleStackOverflowCommand
};

/**
 * Process incoming message and handle commands
 * @param {Object} message - The message object
 * @param {Object} socket - The socket object
 * @returns {Promise<void>}
 */
export const handleCommand = async (message, socket) => {
    try {
        // Check if message starts with command prefix
        if (!message.content.startsWith(COMMAND_PREFIX)) {
            return false; // Not a command
        }

        // Extract command and arguments
        const [command, ...args] = message.content
            .slice(COMMAND_PREFIX.length)
            .trim()
            .toLowerCase()
            .split(' ');

        // Check if command exists
        const commandHandler = COMMANDS[command];
        if (!commandHandler) {
            return false; // Command not found
        }

        // Execute command handler
        await commandHandler(message, socket, args);
        return true; // Command was handled
    } catch (error) {
        console.error('Error handling command:', error);
        // Send error message to user
        socket.emit('message', {
            type: 'error',
            content: 'Failed to process command'
        });
        return true; // Command was attempted to be handled
    }
}; 