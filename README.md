Project Structure:
src/
├── config/                  # Configuration files
├── models/                  # Database models
│   ├── User.js              # User model
│   ├── UserReport.js        # User report model
│   ├── Friends.js           # Friends model
│   ├── Workspace.js         # Workspace model
│   ├── UserWorkspace.js     # User-Workspace relationship model
│   ├── Channel.js           # Channel model
│   ├── Thread.js            # Thread model
│   ├── Message.js           # Message model
│   ├── DirectMessage.js     # Direct message model
│   ├── File.js              # File model
│   └── Task.js              # Task model
├── api/                     # API routes and controllers
│   ├── auth/                # Authentication
│   │   ├── auth.controller.js
│   │   └── auth.router.js
│   ├── users/               # User management
│   │   ├── user.controller.js
│   │   └── user.router.js
│   ├── friends/             # Friend management
│   │   ├── friends.controller.js
│   │   └── friends.router.js
│   ├── reports/             # User reports
│   │   ├── reports.controller.js
│   │   └── reports.router.js
│   ├── workspace/           # Workspace management
│   │   ├── workspace.controller.js
│   │   └── workspace.router.js
│   ├── channels/            # Channel management
│   │   ├── channels.controller.js
│   │   └── channels.router.js
│   ├── threads/             # Thread management
│   │   ├── threads.controller.js
│   │   └── threads.router.js
│   ├── messages/            # Message management
│   │   ├── messages.controller.js
│   │   └── messages.router.js
│   ├── direct-messages/     # Direct message management
│   │   ├── dm.controller.js
│   │   └── dm.router.js
│   ├── files/               # File management
│   │   ├── files.controller.js
│   │   └── files.router.js
│   └── tasks/               # Task management
│       ├── tasks.controller.js
│       └── tasks.router.js
├── middleware/              # Middleware functions
│   ├── auth.middleware.js   # Authentication middleware
│   ├── error.middleware.js  # Error handling middleware
│   └── upload.middleware.js # File upload middleware
├── utils/                   # Utility functions
├── services/                # Business logic services
│   ├── email.service.js     # Email service
│   ├── notification.service.js # Notification service
│   └── file.service.js      # File handling service
├── views/                   # View templates (if using server-side rendering)
└── server.js                # Main application file