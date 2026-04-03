const URGENT_KEYWORDS = [
  "notfall", "ausfall", "down", "offline", "kritisch", "emergency", "urgent",
  "server down", "nicht erreichbar", "totalausfall", "sicherheitslücke",
  "datenverlust", "production", "produktiv",
];

const HIGH_KEYWORDS = [
  "dringend", "wichtig", "fehler", "error", "bug", "kaputt", "funktioniert nicht",
  "blockiert", "blocked", "blocker", "deadline", "geht nicht", "problem",
  "störung", "broken",
];

const LOW_KEYWORDS = [
  "frage", "question", "wunsch", "feature request", "verbesserung", "improvement",
  "nice to have", "irgendwann", "vorschlag", "suggestion", "info", "information",
  "dokumentation",
];

export function detectPriority(subject: string, description: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null {
  const text = `${subject} ${description}`.toLowerCase();

  for (const keyword of URGENT_KEYWORDS) {
    if (text.includes(keyword)) return "URGENT";
  }
  for (const keyword of HIGH_KEYWORDS) {
    if (text.includes(keyword)) return "HIGH";
  }
  for (const keyword of LOW_KEYWORDS) {
    if (text.includes(keyword)) return "LOW";
  }

  return null; // No auto-detection, keep default
}
