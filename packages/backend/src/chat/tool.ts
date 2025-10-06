const tools = [
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'Searches for relevant text chunks within the pocket.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The natural language query for the vector search.',
          },
          source_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of source IDs to restrict search.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_sources_in_pocket',
      description:
        'Lists all available source documents in the current pocket.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'provide_final_answer',
      description:
        'Call this function ONLY when you have gathered all necessary information and are ready to provide the final, complete answer to the user. This function will return a full answer based on your thoughts.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export { tools };
