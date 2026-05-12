import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './spec';

const router = Router();

// Cache da spec (build uma vez por boot)
const spec = buildOpenApiSpec();

// GET /api/openapi.json — máquina-legível
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(spec);
});

// GET /api/docs — Swagger UI HTML
router.use('/docs', swaggerUi.serve);
router.get(
  '/docs',
  swaggerUi.setup(spec as any, {
    customSiteTitle: 'CondoSync API',
    customCss: '.topbar { display: none; }',
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  }),
);

export default router;
