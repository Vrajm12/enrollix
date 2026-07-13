import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BACKUP_DIR: z.string().min(1).default("/var/backups/guruverse"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  ROOT_DOMAIN: z.string().default("guruverse.co.in,guruverse.com"),
  ALLOW_SUBDOMAIN_ORIGINS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  // WhatsApp Business API
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_TOKEN: z.string().optional(),
  // Meta Lead Ads Webhook
  META_VERIFY_TOKEN: z.string().optional(),
  // Twilio SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  // SMTP Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Local safety rails for bulk email sending
  EMAIL_BULK_MAX_RECIPIENTS: z.coerce.number().default(200),
  EMAIL_BULK_DELAY_MS: z.coerce.number().default(250)
});

export const env = envSchema.parse(process.env);
