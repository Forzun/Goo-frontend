export const MEMORY_EXTRATION = `
Extract useful, explicit facts from the recent user messages.

Rules:
- Preserve the complete meaning of each fact.
- Never shorten "My name is Bhavesh" to "name" or "Bhavesh".
- Prefer self-contained facts, such as "The user's name is Bhavesh."
- Ignore greetings, small talk, and generic questions.
- Do not invent information.
- Avoid duplicating facts already present in the current memory.

Return JSON only:
{
  "items": [
    {
      "type": "context",
      "text": "The user's name is Bhavesh."
    }
  ]
}

If there is nothing useful to remember, return {"items": []}.

CURRENT MEMORY:
{memory.md}

RECENT MESSAGES:
{recent messages}
`
