"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Rotas públicas
router.post('/register', auth_controller_1.authController.register.bind(auth_controller_1.authController));
router.post('/login', rateLimiter_1.authRateLimiter, auth_controller_1.authController.login.bind(auth_controller_1.authController));
router.post('/refresh', auth_controller_1.authController.refresh.bind(auth_controller_1.authController));
router.post('/logout', auth_controller_1.authController.logout.bind(auth_controller_1.authController));
router.post('/forgot-password', rateLimiter_1.authRateLimiter, auth_controller_1.authController.requestPasswordReset.bind(auth_controller_1.authController));
router.post('/reset-password', auth_controller_1.authController.resetPassword.bind(auth_controller_1.authController));
// Rotas autenticadas
router.get('/me', auth_1.authenticate, auth_controller_1.authController.me.bind(auth_controller_1.authController));
router.put('/change-password', auth_1.authenticate, auth_controller_1.authController.changePassword.bind(auth_controller_1.authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map