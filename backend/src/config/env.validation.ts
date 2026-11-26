import * as Joi from 'joi';

/**
 * Environment schema validated at startup by ConfigModule.
 * The app refuses to boot if a required variable is missing or invalid
 * (no hardcoded fallbacks for secrets).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(32).required(),
  // vercel/ms duration WITH a unit ("15m", "8h", "1d"). jsonwebtoken reads a
  // unitless string ("3600") as milliseconds, so units are mandatory.
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+\s?(ms|s|m|h|d|w|y)$/i)
    .default('1d'),
  // Max attempts per IP within the window (login and change-password).
  LOGIN_THROTTLE_LIMIT: Joi.number().integer().min(1).default(5),
  LOGIN_THROTTLE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  // Comma-separated list of allowed browser origins.
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
})
  // Report every invalid/missing variable at once, keep unrelated env vars.
  .prefs({ abortEarly: false, allowUnknown: true });

export interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  LOGIN_THROTTLE_LIMIT: number;
  LOGIN_THROTTLE_TTL_SECONDS: number;
}
