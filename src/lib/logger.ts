/**
 * Utilitas log terpusat AntriYuk yang otomatis membuang data pribadi (PII)
 * seperti alamat email, token autentikasi, Expo Push Token, dan kata sandi,
 * serta dimatikan sepenuhnya pada build production (!__DEV__).
 */

const SENSITIVE_KEYS = new Set([
  'email',
  'password',
  'newpassword',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'expopushtoken',
  'expo_push_token',
  'pushtoken',
  'push_token',
  'authorization',
  'apikey',
  'api_key',
  'secret',
  'service_role',
  'servicerolekey',
  'display_name',
  'displayname',
  'phone',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EXPO_PUSH_TOKEN_REGEX = /(?:ExponentPushToken|ExpoPushToken)\[[^\]]+\]/g;
const JWT_REGEX = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;

export function redactPiiString(input: string): string {
  return input
    .replace(EMAIL_REGEX, '[EMAIL_DISEMBUNYIKAN]')
    .replace(EXPO_PUSH_TOKEN_REGEX, '[PUSH_TOKEN_DISEMBUNYIKAN]')
    .replace(JWT_REGEX, '[JWT_DISEMBUNYIKAN]')
    .replace(BEARER_REGEX, 'Bearer [TOKEN_DISEMBUNYIKAN]');
}

export function sanitizeLogPayload(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[OBJEK_TERLALU_DALAM]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactPiiString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactPiiString(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogPayload(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [rawKey, rawVal] of Object.entries(value)) {
      const normalizedKey = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (SENSITIVE_KEYS.has(normalizedKey)) {
        sanitized[rawKey] = '[DISEMBUNYIKAN]';
      } else {
        sanitized[rawKey] = sanitizeLogPayload(rawVal, depth + 1);
      }
    }
    return sanitized;
  }

  return '[DATA_TIDAK_DIKENAL]';
}

const isDevEnvironment = typeof __DEV__ !== 'undefined' && Boolean(__DEV__);

export const logger = {
  debug(tag: string, message: string, meta?: unknown): void {
    if (!isDevEnvironment) {
      return;
    }
    const cleanMessage = redactPiiString(message);
    if (meta !== undefined) {
      console.debug(`[${tag}] ${cleanMessage}`, sanitizeLogPayload(meta));
    } else {
      console.debug(`[${tag}] ${cleanMessage}`);
    }
  },

  info(tag: string, message: string, meta?: unknown): void {
    if (!isDevEnvironment) {
      return;
    }
    const cleanMessage = redactPiiString(message);
    if (meta !== undefined) {
      console.info(`[${tag}] ${cleanMessage}`, sanitizeLogPayload(meta));
    } else {
      console.info(`[${tag}] ${cleanMessage}`);
    }
  },

  warn(tag: string, message: string, meta?: unknown): void {
    if (!isDevEnvironment) {
      return;
    }
    const cleanMessage = redactPiiString(message);
    if (meta !== undefined) {
      console.warn(`[${tag}] ${cleanMessage}`, sanitizeLogPayload(meta));
    } else {
      console.warn(`[${tag}] ${cleanMessage}`);
    }
  },

  error(tag: string, message: string, meta?: unknown): void {
    if (!isDevEnvironment) {
      return;
    }
    const cleanMessage = redactPiiString(message);
    if (meta !== undefined) {
      console.error(`[${tag}] ${cleanMessage}`, sanitizeLogPayload(meta));
    } else {
      console.error(`[${tag}] ${cleanMessage}`);
    }
  },
};

