interface RelevantChunk {
  source: {
    id: string;
  };
}

/**
 * Creates the prompt for generating a hypothetical answer (HyDE).
 * This answer is used to perform a vector search for relevant documents.
 *
 * @param chatHistory A string representing the recent conversation history.
 * @param userQuery The latest query from the user.
 * @returns The fully formatted HyDE prompt string.
 */
export function createHydePrompt(
  chatHistory: string,
  userQuery: string,
): string {
  return `Based on the chat history and the user's latest query, generate a hypothetical, concise paragraph that contains the most likely answer. This will be used to find relevant documents.
  ---
  CHAT HISTORY:
  ${chatHistory}
  ---
  USER QUERY:
  "${userQuery}"
  ---
  HYPOTHETICAL ANSWER:`;
}

/**
 * Creates the final RAG (Retrieval-Augmented Generation) prompt.
 * This prompt instructs the AI on how to answer the user's query using the provided context.
 *
 * @param context A string containing the relevant source chunks.
 * @param chatHistory A string representing the recent conversation history.
 * @param userQuery The latest query from the user.
 * @param relevantChunks An array of the source chunks used to build the context.
 * @returns The fully formatted final prompt string.
 */
export function createFinalRagPrompt(
  context: string,
  chatHistory: string,
  userQuery: string,
  relevantChunks: RelevantChunk[],
): string {
  let citationExample = `[${relevantChunks[0]?.source.id}]`;
  if (relevantChunks.length > 1) {
    citationExample = `[${relevantChunks[0]?.source.id}, ${relevantChunks[1]?.source.id}]`;
  }

  return `You are Fylr, a helpful AI assistant. Your goal is to answer the user's query based on the provided context and conversation history.
  
  RULES:
  - Use the provided context to answer the query.
  - If the context does not contain the answer, state that you couldn't find the information in the provided documents. Do not use external knowledge.
  - Keep your answers concise and to the point.
  - When you use information from a source, cite it at the end of the sentence like this: ${citationExample}.
  - You can cite multiple sources.
  
  ---
  CONTEXT:
  ${context || 'No context was found.'}
  ---
  CHAT HISTORY:
  ${chatHistory}
  ---
  USER QUERY:
  "${userQuery}"
  ---
  ASSISTANT RESPONSE:`;
}
