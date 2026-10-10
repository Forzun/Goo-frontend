
export const MEMORY_EXTRATION = `
  Review these recent messages and identify useful information for future turns.
Compare it with the current memory.

Return JSON only:
{
  "items": [
    {
      "type": "goal | context | preference | decision | correction | open_question | next_step",
      "text": "One concise fact"
    }
  ]
}

Do not repeat existing facts, invent information, or store secrets.
If nothing is worth remembering, return {"items": []}.

CURRENT MEMORY:
{memory.md}

RECENT MESSAGES:
{recent messages}
`
