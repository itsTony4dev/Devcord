import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Devcord API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Devcord application',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: [
    './src/api/**/*.js',
    './src/config/swagger-schemas.js'
  ], // Path to the API docs and schemas
};

const specs = swaggerJsdoc(options);

export default specs; 