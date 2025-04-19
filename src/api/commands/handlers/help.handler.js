/**
 * Help Command Handler
 * Displays available commands and their usage
 */

const COMMANDS_HELP = {
    help: {
        description: 'Display available commands',
        usage: '/help [command]'
    },
    ai: {
        description: 'Interact with AI assistant',
        usage: '/ai <prompt>'
    },
    sof: {
        description: 'Search Stack Overflow',
        usage: '/sof <query> [page] [sort]'
    }
};

/**
 * Handle help command
 * @param {Object} message - The message object
 * @param {Object} socket - The socket object
 * @param {Array} args - Command arguments
 */
export const handleHelpCommand = async (message, socket, args) => {
    try {
        // If specific command help is requested
        if (args.length > 0) {
            const command = args[0].toLowerCase();
            const commandHelp = COMMANDS_HELP[command];
            
            if (!commandHelp) {
                socket.emit('message', {
                    type: 'error',
                    content: `Command '${command}' not found. Use /help to see available commands.`
                });
                return;
            }

            // Send specific command help
            socket.emit('message', {
                type: 'command-help',
                content: {
                    command,
                    ...commandHelp
                }
            });
            return;
        }

        // Send all commands help
        socket.emit('message', {
            type: 'command-help',
            content: {
                commands: COMMANDS_HELP
            }
        });
    } catch (error) {
        console.error('Error in help command:', error);
        socket.emit('message', {
            type: 'error',
            content: 'Failed to display help information'
        });
    }
}; 