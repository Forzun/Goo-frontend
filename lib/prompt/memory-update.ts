
export const MEMORY_UPDATE = `
  Compare the candidate facts with the current memory.

  Return JSON only:
  {
    "operations": [
      {
        "action": "add | replace | remove | ignore",
        "section": "Current goal | Important context | User preferences | Decisions | Open questions | Next steps",
        "old_text": null,
        "new_text": "One concise bullet",
        "reason": "Short reason"
      }
    ]
  }

  Add new useful facts, replace outdated facts, merge duplicates,
  and leave unrelated facts unchanged.
  Do not store secrets.

  CURRENT MEMORY:
  {memory.md}

  CANDIDATE FACTS:
  {items from extraction}
`
