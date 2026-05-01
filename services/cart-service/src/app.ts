import express, { Express, Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { logger } from '@teleshop/common/middleware';
import { 
  currentUser, 
  errorHandler 
} from '@teleshop/common/middleware';
import CartRouter from './modules/cart';

export const app: Express = express();

// ============ MIDDLEWARE ============

// Logging
app.use(pinoHttp({ logger }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// User context extraction
app.use(currentUser);

// ============ HEALTH CHECK ============

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'cart-service',
    timestamp: new Date(),
  });
});

// ============ API ROUTES ============

app.use('/api/cart', CartRouter);

// ============ 404 HANDLER ============

app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: 'Route not found',
    statusCode: 404,
  });
});

// ============ ERROR HANDLER ============

app.use(errorHandler);

export default app;
