/**
 * Headers de seguridad estándar para todas las respuestas del microservicio
 * Implementa las mejores prácticas de seguridad web
 */
export const SECURITY_HEADERS = {
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self';",
  "x-content-type-options": "nosniff",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "X-Frame-Options": "SAMEORIGIN",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cache-Control": "no-store, no-cache, must-revalidate"
} as const;

/**
 * Headers adicionales para respuestas exitosas
 */
export const SUCCESS_HEADERS = {
  ...SECURITY_HEADERS,
  "Content-Type": "application/json",
  "X-Flow-Completed": "true",
  "X-Original-Headers-Processed": "true"
} as const;

/**
 * Headers para respuestas de error
 */
export const ERROR_HEADERS = {
  ...SECURITY_HEADERS,
  "Content-Type": "application/json"
} as const;

/**
 * Headers para respuestas de fraude (403)
 */
export const FRAUD_HEADERS = {
  ...SECURITY_HEADERS,
  "Content-Type": "application/json",
  "X-Security-Status": "fraud-detected"
} as const;
