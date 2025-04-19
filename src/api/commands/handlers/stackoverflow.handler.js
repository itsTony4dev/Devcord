import { searchQuestions } from '../../stackoverflow/stackoverflow.controller.js';

/**
 * StackOverflow Command Handler
 * Handles StackOverflow search commands
 */

/**
 * Handle StackOverflow command
 * @param {Object} message - The message object
 * @param {Object} socket - The socket object
 * @param {Array} args - Command arguments
 */
export const handleStackOverflowCommand = async (message, socket, args) => {
    try {
        if (args.length === 0) {
            socket.emit('message', {
                type: 'error',
                content: 'Please provide a search query. Usage: /sof <query> [page] [sort]'
            });
            return;
        }

        // Extract search parameters
        const query = args[0];
        const page = args[1] ? parseInt(args[1]) : 1;
        const sort = args[2] || 'votes';

        // Create mock request and response objects for the controller
        const mockReq = {
            query: { query, page, sort, order: 'desc' }
        };

        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    // Send search results through socket
                    socket.emit('message', {
                        type: 'stackoverflow-results',
                        content: {
                            query,
                            results: data.data.items,
                            total: data.data.total,
                            page
                        }
                    });
                }
            })
        };

        // Call the search controller
        await searchQuestions(mockReq, mockRes);
    } catch (error) {
        console.error('Error in StackOverflow command:', error);
        socket.emit('message', {
            type: 'error',
            content: 'Failed to search Stack Overflow'
        });
    }
}; 