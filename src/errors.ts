export class WowLogsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WowLogsApiError';
  }
}

export function friendlyError(err: unknown): string {
  if (err instanceof WowLogsApiError) {
    switch (err.status) {
      case 404: return '❌ No se encontró. Verificá que el ID sea correcto y la guild sea pública.';
      case 429: return '⏳ Demasiadas peticiones. Esperá un momento e intentá de nuevo.';
      case 401:
      case 403: return '🔑 API key inválida o sin permisos. Revisá la configuración.';
    }
    if (err.status >= 500) return '🔧 wow-logs.co.in está con problemas. Intentá más tarde.';
    return `❌ Error de la API: ${err.message}`;
  }

  if (err instanceof Error) {
    const cause = (err as any).cause;
    if (cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || cause?.code === 'ECONNREFUSED' || err.message.includes('fetch failed')) {
      return '⏳ No se pudo conectar con wow-logs.co.in. Intentá más tarde.';
    }
  }

  return '❌ Error inesperado. Revisá los logs del bot.';
}
