import * as Sentry from '@sentry/react-native';
import { redactPiiString, sanitizeLogPayload } from '@/lib/logger';

const rawSentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

export const isSentryConfigured =
  rawSentryDsn.length > 0 && rawSentryDsn.startsWith('https://');

let initialized = false;

/**
 * Inisialisasi pelaporan error Sentry untuk React Native tanpa data pribadi (PII)
 * dan dengan sampling rendah agar hemat kuota paket gratis.
 * [VERIFIKASI: langkah setup @sentry/react-native/expo serta kuota paket gratis Developer Plan perlu diverifikasi di dokumentasi resmi Sentry & Expo]
 */
export function initSentry(): void {
  if (initialized || !isSentryConfigured) {
    return;
  }

  Sentry.init({
    dsn: rawSentryDsn,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    attachStacktrace: true,
    beforeSend(event) {
      // Buang seluruh identitas pribadi dari objek user
      if (event.user) {
        event.user = {
          id: event.user.id,
        };
      }

      // Buang header & cookie dari objek request
      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.url) {
          event.request.url = redactPiiString(event.request.url);
        }
      }

      // Sanitasi pesan exception
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) {
            ex.value = redactPiiString(ex.value);
          }
        }
      }

      // Sanitasi pesan breadcrumb
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.message) {
            crumb.message = redactPiiString(crumb.message);
          }
          if (crumb.data) {
            const cleaned = sanitizeLogPayload(crumb.data);
            if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned)) {
              crumb.data = cleaned as Record<string, unknown>;
            }
          }
        }
      }

      return event;
    },
  });

  initialized = true;
}

export function captureExceptionSafely(
  error: unknown,
  contextTag?: string
): void {
  if (!isSentryConfigured) {
    return;
  }

  const sanitizedError =
    error instanceof Error
      ? new Error(redactPiiString(error.message))
      : new Error(redactPiiString(String(error)));

  if (error instanceof Error && error.stack) {
    sanitizedError.stack = redactPiiString(error.stack);
  }

  Sentry.captureException(sanitizedError, {
    tags: contextTag ? { source: contextTag } : undefined,
  });
}

