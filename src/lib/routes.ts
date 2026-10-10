// Query-string routes so the app exports as a fully static site (no server).
export const routes = {
  lesson: (id: string) => `/lesson?id=${id}`,
  topic: (id: string) => `/topic?id=${id}`,
  exam: (topicId: string) => `/exam?topic=${topicId}`,
};
