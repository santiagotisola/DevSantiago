"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("./env");
const logger_1 = require("./logger");
exports.transporter = nodemailer_1.default.createTransport({
    host: env_1.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(env_1.env.SMTP_PORT),
    secure: parseInt(env_1.env.SMTP_PORT) === 465,
    auth: {
        user: env_1.env.SMTP_USER,
        pass: env_1.env.SMTP_PASS,
    },
});
const sendMail = async (to, subject, html) => {
    try {
        const info = await exports.transporter.sendMail({
            from: env_1.env.SMTP_FROM,
            to,
            subject,
            html,
        });
        logger_1.logger.info(`Message sent: ${info.messageId}`);
        // If using ethereal email for testing
        if (env_1.env.SMTP_HOST === 'smtp.ethereal.email') {
            logger_1.logger.info(`Preview URL: ${nodemailer_1.default.getTestMessageUrl(info)}`);
        }
        return info;
    }
    catch (error) {
        logger_1.logger.error('Error sending email:', error);
        throw error;
    }
};
exports.sendMail = sendMail;
//# sourceMappingURL=mail.js.map