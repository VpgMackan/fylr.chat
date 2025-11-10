/**
 * Sanitizes text to ensure valid UTF-8 encoding and removes problematic characters
 * that can cause encoding issues when transmitting over WebSocket or serializing to JSON
 */
export function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return text === null ? null : text || null;

  try {
    // Replace invalid UTF-8 sequences and normalize Unicode
    let sanitized = text
      // Replace invalid surrogate pairs (U+D800 to U+DFFF)
      .replace(/[\uD800-\uDFFF]/g, '')
      // Remove control characters except newline, tab, and carriage return
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // Normalize various Unicode spaces to regular space
      .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Normalize Unicode to NFC (composed form)
      .normalize('NFC')
      // Replace NULL bytes which can cause issues
      .replace(/\0/g, '');

    // Additional step: encode to UTF-8 and decode back to ensure validity
    // This will replace any remaining problematic characters
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const bytes = encoder.encode(sanitized);
    sanitized = decoder.decode(bytes);

    return sanitized;
  } catch (error) {
    // If all else fails, remove all non-ASCII characters
    console.error('Error sanitizing text, falling back to ASCII:', error);
    return text.replace(/[^\x00-\x7F]/g, '');
  }
}

/**
 * Recursively sanitizes all string values in an object, including nested objects and arrays
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj) as T;
  }

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((item) =>
      sanitizeObject(item),
    ) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value as unknown);
    }
    return sanitized as unknown as T;
  }

  return obj;
}

/**
 * Sanitizes a message object before sending it through Socket.IO
 */
export function sanitizeMessage(message: unknown): unknown {
  if (!message) return message;

  if (typeof message !== 'object' || message === null) return message;

  const msg = message as Record<string, unknown>;

  const sanitized: Record<string, unknown> = {
    ...msg,
    content:
      'content' in msg
        ? sanitizeText(msg.content as string | null | undefined)
        : undefined,
    reasoning:
      'reasoning' in msg
        ? sanitizeText(msg.reasoning as string | null | undefined)
        : undefined,
    toolCalls:
      'toolCalls' in msg && msg.toolCalls !== undefined
        ? sanitizeObject(msg.toolCalls as unknown)
        : msg.toolCalls,
    toolResult:
      'toolResult' in msg && msg.toolResult !== undefined
        ? sanitizeObject(msg.toolResult as unknown)
        : msg.toolResult,
    metadata:
      'metadata' in msg && msg.metadata !== undefined
        ? sanitizeObject(msg.metadata as unknown)
        : msg.metadata,
  };

  return sanitized as unknown;
}
