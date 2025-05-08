# Devcord

A modern developer chat platform built with Node.js, Express, and MongoDB.

## Features

- 🔐 Secure authentication with JWT
- 👥 Workspace management
- 📨 Real-time messaging
- 📝 Task management
- 📁 File sharing
- 🔍 User search and discovery
- 👥 Friend system
- 🛡️ Role-based access control
- 📱 Responsive design

## Tech Stack

- **Backend:**
  - Node.js
  - Express.js
  - MongoDB with Mongoose
  - JWT for authentication
  - Express Validator for input validation
  - Swagger for API documentation

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/itsTony4dev/devcord.git
cd devcord
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory:
```env
HOST=localhost
PORT=3000

FRONTEND_URL=http://localhost:5173

NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/Devcord

EMAIL_USER=your email
EMAIL_PASS=your email password

JWT_SECRET=your secret key

CLOUDINARY_NAME=name
CLOUDINARY_API_KEY=ypur api key
CLOUDINARY_API_SECRET=your api secret 
CLOUDINARY_URL=cloudinary://your api key:FssiTKtt3P_P92vaBzdvFD7-6bg@name
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The server will start on `http://localhost:3000` (or the port specified in your .env file).

## API Documentation

The API documentation is available at `/api-docs` when the server is running. It provides detailed information about:

- Available endpoints
- Request/response schemas
- Authentication requirements
- Validation rules
- Error responses


## Project Structure

```
devcord/
├── src/
│   ├── api/              # API routes and controllers
│   ├── config/           # Configuration files
│   ├── middleware/       # Custom middleware
│   ├── models/          # Database models
│   ├── utils/           # Utility functions
│   └── server.js        # Main application file
├── .env                 # Environment variables
├── package.json         # Project dependencies
└── README.md           # Project documentation
```

## Development

### Running Tests

```bash
npm test
# or
yarn test
```

### Code Style

This project uses ESLint and Prettier for code formatting. To format your code:

```bash
npm run format
# or
yarn format
```

### Building for Production

```bash
npm run build
# or
yarn build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
