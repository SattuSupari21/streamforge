import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Adaptive Video Streaming API Gateway',
      version: '1.0.0',
      description: 'REST API documentation for adaptive video streaming backend',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: any) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
