import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import {
  authRateLimiter,
  forgotPasswordRateLimiter,
} from '../../middleware/rateLimiter';

const router = Router();

// Rotas públicas — rate-limit em endpoints sensíveis a brute-force/abuso
router.post('/register', authRateLimiter, authController.register.bind(authController));
router.post('/login', authRateLimiter, authController.login.bind(authController));
router.post('/refresh', authRateLimiter, authController.refresh.bind(authController));
router.post('/logout', authController.logout.bind(authController));
// Bucket por email+ip além do bucket geral por ip — evita spam
// direcionado à caixa de entrada de uma vítima específica.
router.post('/forgot-password', authRateLimiter, forgotPasswordRateLimiter, authController.requestPasswordReset.bind(authController));
router.post('/reset-password', authRateLimiter, authController.resetPassword.bind(authController));

// Rotas autenticadas
router.get('/me', authenticate, authController.me.bind(authController));
router.put('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;
