/**
 * Yapılandırılmış hata loglama utility'si.
 * Production'da daha sofistike bir logging çözümüne (ör. Sentry)
 * kolayca entegre edilebilmesi için merkezi bir nokta sağlar.
 */

type LogLevel = 'error' | 'warn' | 'info';

function log(level: LogLevel, context: string, message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console[level](`[${timestamp}] [${context}] ${message}`, {
      error: errorMessage,
      stack: errorStack,
    });
  } else {
    console[level](`[${timestamp}] [${context}] ${message}`);
  }
}

export const logger = {
  error: (context: string, message: string, error?: unknown) =>
    log('error', context, message, error),
  warn: (context: string, message: string, error?: unknown) =>
    log('warn', context, message, error),
  info: (context: string, message: string) => log('info', context, message),
};