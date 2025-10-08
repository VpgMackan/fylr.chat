const tools = [
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
