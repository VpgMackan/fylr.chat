/**
 * Error classification and structured error response utilities for tool execution.
 * Provides self-correction guidance to the AI agent.
 */

export enum ToolErrorType {
  NOT_FOUND = 'not_found',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  EMPTY_RESULT = 'empty_result',
  UNKNOWN = 'unknown',
}

export interface StructuredToolError {
  error: true;
  error_type: ToolErrorType;
  message: string;
  tool_name: string;
  original_error?: string;
  suggested_actions: string[];
  retry_recommended: boolean;
  alternative_tools?: string[];
}

/**
 * Classifies an error into a specific error type based on error message and properties.
 */
export function classifyError(error: {
  message?: string;
  code?: string;
  response?: { status: number };
}): ToolErrorType {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errorMessage = rawMessage?.toLowerCase() ?? '';
  const errorCode = error.code?.toLowerCase();

  const hasStatus = (s?: number) => typeof s === 'number';

  const isNetworkError = () =>
    errorCode === 'enotfound' ||
    errorCode === 'econnrefused' ||
    errorMessage.includes('network') ||
    errorMessage.includes('dns') ||
    errorMessage.includes('domain not found');

  const isTimeoutError = () =>
    errorCode === 'etimedout' ||
    errorCode === 'econnaborted' ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out');

  const isAuthError = () =>
    error.response?.status === 401 ||
    error.response?.status === 403 ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('api key');

  const isRateLimitError = () =>
    error.response?.status === 429 ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests');

  const isNotFoundError = () =>
    error.response?.status === 404 ||
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('no such');

  const isValidationError = () =>
    error.response?.status === 400 ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('must be');

  const isServerError = () =>
    (hasStatus(error.response?.status) &&
      (error.response!.status as number) >= 500) ||
    errorMessage.includes('server error') ||
    errorMessage.includes('service unavailable');

  const isEmptyResult = () =>
    errorMessage.includes('no results') ||
    errorMessage.includes('empty') ||
    errorMessage.includes('no information found');

  if (isNetworkError()) return ToolErrorType.NETWORK;
  if (isTimeoutError()) return ToolErrorType.TIMEOUT;
  if (isAuthError()) return ToolErrorType.AUTHENTICATION;
  if (isRateLimitError()) return ToolErrorType.RATE_LIMIT;
  if (isNotFoundError()) return ToolErrorType.NOT_FOUND;
  if (isValidationError()) return ToolErrorType.VALIDATION;
  if (isServerError()) return ToolErrorType.SERVER_ERROR;
  if (isEmptyResult()) return ToolErrorType.EMPTY_RESULT;

  return ToolErrorType.UNKNOWN;
}

/**
 * Get suggested recovery actions based on error type.
 */
function getSuggestedActions(
  errorType: ToolErrorType,
  toolName: string,
): string[] {
  switch (errorType) {
    case ToolErrorType.NOT_FOUND:
      return [
        'Try using broader or different search terms',
        'Check if the resource ID or reference is correct',
        'Try searching in different sources or locations',
        'Consider using alternative tools to find similar information',
      ];

    case ToolErrorType.NETWORK:
      return [
        'The resource is temporarily unreachable',
        'Try a different URL or search query',
        'If searching the web, try alternative search terms',
        'Consider using cached or alternative sources',
      ];

    case ToolErrorType.TIMEOUT:
      return [
        'The request took too long - the source may be slow or unavailable',
        'Try again with a simpler query',
        'Try accessing a different source',
        'Consider breaking down complex requests into smaller parts',
      ];

    case ToolErrorType.AUTHENTICATION:
      return [
        'The external service authentication failed',
        'This is a configuration issue - inform the user',
        "Try alternative tools or sources that don't require this service",
      ];

    case ToolErrorType.RATE_LIMIT:
      return [
        'Too many requests to this service',
        'Try alternative sources or tools',
        'Consolidate multiple queries into fewer, more comprehensive searches',
      ];

    case ToolErrorType.VALIDATION:
      return [
        'The query parameters were invalid',
        'Review and adjust the input parameters',
        'Ensure required fields are provided correctly',
        'Try reformulating the query with different parameters',
      ];

    case ToolErrorType.SERVER_ERROR:
      return [
        'The external service is experiencing issues',
        'Try alternative sources or tools',
        'Retry later if this is critical information',
      ];

    case ToolErrorType.EMPTY_RESULT:
      return [
        'No results found with current query',
        'Try broader search terms or different keywords',
        'Use synonyms or related concepts',
        'Try breaking down the query into component parts',
        'Consider if the information exists in available sources',
      ];

    default:
      return [
        'An unexpected error occurred',
        'Try reformulating your approach',
        'Consider using alternative tools or search strategies',
      ];
  }
}

/**
 * Get alternative tools that might work when a specific tool fails.
 */
function getAlternativeTools(
  errorType: ToolErrorType,
  toolName: string,
): string[] {
  const alternatives: string[] = [];

  switch (toolName) {
    case 'search_documents':
      if (
        errorType === ToolErrorType.EMPTY_RESULT ||
        errorType === ToolErrorType.NOT_FOUND
      ) {
        alternatives.push(
          'list_associated_sources() - to see what documents are available',
          'web_search() - to find information from the internet instead',
        );
      }
      break;

    case 'web_search':
      if (
        errorType === ToolErrorType.EMPTY_RESULT ||
        errorType === ToolErrorType.NOT_FOUND
      ) {
        alternatives.push(
          'Try reformulating the search with different terms',
          'search_documents() - to check local documents instead',
        );
      }
      break;

    case 'fetch_webpage':
      if (
        errorType === ToolErrorType.NETWORK ||
        errorType === ToolErrorType.TIMEOUT ||
        errorType === ToolErrorType.NOT_FOUND
      ) {
        alternatives.push(
          'web_search() - to find alternative sources on the same topic',
        );
      }
      break;

    case 'read_document_chunk':
      if (errorType === ToolErrorType.NOT_FOUND) {
        alternatives.push(
          'search_documents() - to find the correct chunk location',
          'list_associated_sources() - to verify the source exists',
        );
      }
      break;
  }

  return alternatives;
}

/**
 * Creates a structured error response that helps the agent self-correct.
 */
export function createStructuredError(
  error: { message?: string; code?: string; response?: { status: number } },
  toolName: string,
): StructuredToolError {
  const errorType = classifyError(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Determine if retry is recommended
  const retryRecommended =
    errorType === ToolErrorType.TIMEOUT ||
    errorType === ToolErrorType.SERVER_ERROR ||
    errorType === ToolErrorType.RATE_LIMIT;

  return {
    error: true,
    error_type: errorType,
    message: errorMessage,
    tool_name: toolName,
    original_error: error instanceof Error ? error.stack : undefined,
    suggested_actions: getSuggestedActions(errorType, toolName),
    retry_recommended: retryRecommended,
    alternative_tools: getAlternativeTools(errorType, toolName),
  };
}

/**
 * Wraps an empty result (no error, but no useful data) as a structured response.
 */
export function createEmptyResultResponse(
  toolName: string,
  queryOrMessage: string,
): StructuredToolError {
  return {
    error: true,
    error_type: ToolErrorType.EMPTY_RESULT,
    message: `No results found for query: "${queryOrMessage}"`,
    tool_name: toolName,
    suggested_actions: getSuggestedActions(
      ToolErrorType.EMPTY_RESULT,
      toolName,
    ),
    retry_recommended: true,
    alternative_tools: getAlternativeTools(
      ToolErrorType.EMPTY_RESULT,
      toolName,
    ),
  };
}
