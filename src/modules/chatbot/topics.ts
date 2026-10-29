// What people can ask the assistant, shown on /chat and in an empty conversation.
// Keep these within what the system prompt (server/assistant.ts) actually covers.

export interface AskTopic {
  title: string;
  description: string;
  examples: readonly string[];
}

export const ASK_TOPICS: readonly AskTopic[] = [
  {
    title: "Find a job",
    description: "Say what you want to do, where and how, and get search terms and links to matching listings.",
    examples: [
      "Show me remote DevOps contract jobs",
      "Part-time customer service jobs in Glasgow",
      "What should I search for if I want warehouse work?",
    ],
  },
  {
    title: "Explore career options",
    description: "Talk through a change of direction, the next step up, or what a role involves.",
    examples: [
      "What jobs could I do with a history degree?",
      "How do I move from retail into an office job?",
      "What qualifications do I need to become an electrician?",
    ],
  },
  {
    title: "Prepare a job brief",
    description: "For employers: turn a vacancy into a clear brief and advert, with screening questions.",
    examples: [
      "Help me write a job brief for a Band 5 staff nurse",
      "What should a warehouse supervisor job advert include?",
      "Suggest screening questions for a junior accountant",
    ],
  },
  {
    title: "CV, applications and interviews",
    description: "Get feedback on CV text, a first draft of a cover letter, or practice interview questions.",
    examples: [
      "How can I make my CV summary stronger?",
      "Help me write a cover letter for a teaching job",
      "What should I ask at the end of an interview?",
    ],
  },
];
