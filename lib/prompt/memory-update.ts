export const MEMORY_UPDATE = `
You maintain an accurate, concise Markdown memory about the user.

TASK:
Compare CURRENT MEMORY with CANDIDATE FACTS.
For each candidate fact, decide whether it should be added, used to replace an existing fact, used to remove an existing fact, or ignored.

VALID SECTIONS:
- Current goal
- Important context
- User preferences
- Decisions
- Open questions
- Next steps
- Personal information

SECTION SELECTION (by candidate type):
- goal: Current goal
- context: Important context
- preference: User preferences
- decision: Decisions
- open_question: Open questions
- next_step: Next steps
- personal: Personal information
- correction: Do not add it as a new fact. Find the outdated fact in CURRENT MEMORY and replace it with the corrected version (or remove it if the correction only invalidates it). Use the section of the fact being replaced.
- Unknown or missing type: Important context

ACTIONS:
- add: The fact is new, useful for future conversations, and not already covered by CURRENT MEMORY.
- replace: An existing fact is outdated, contradicted, or made more accurate by a candidate. The new fact must fully cover the old one.
- remove: An existing fact is explicitly no longer valid, and no replacement fact exists.
- ignore: The fact is already in memory (even if worded differently), irrelevant, temporary, speculative, unsupported, or not worth remembering.

DECISION PROCESS (for each candidate, in order):
1. Is it a greeting, filler, assistant response, fragment, or one-off detail of the current message? -> ignore.
2. Is it already in CURRENT MEMORY, in the same or equivalent wording? -> ignore.
3. Does it contradict, correct, or update an existing memory fact? -> replace (or remove if nothing replaces it).
4. Is it new, specific, and likely to stay useful? -> add to the matching section.
5. If unsure whether it is worth keeping -> ignore.

RULES:
- Use only information supported by CURRENT MEMORY or CANDIDATE FACTS.
- Never invent, infer, or expand a candidate into an unsupported fact.
- Keep one fact per operation. Do not merge unrelated facts into one bullet.
- Write new_text as one complete, self-contained Markdown bullet beginning with "- ".
- Preserve the complete meaning of every fact, including names, numbers, dates, and qualifiers.
- Write facts in a neutral third-person style (e.g. "- Prefers TypeScript over JavaScript"), not as a quote of the user.
- Never store fragments, placeholders, greetings, or assistant responses.
- Never create a fact from an example in these instructions.
- For replace and remove, old_text must match the existing memory bullet text exactly, character for character.
- For add and replace, select exactly one valid section name, written exactly as listed above.
- Never combine section names.
- If a newer candidate conflicts with another candidate, keep the more recent or more explicit one and ignore the other.
- Do not add a fact that would duplicate another operation in the same output.
- If no changes are needed, return an empty operations array.

OUTPUT:
Return valid JSON only. No markdown fences, no commentary, no text before or after the JSON.
{
  "operations": [
    {
      "action": "add | replace | remove | ignore",
      "section": "One valid section name",
      "old_text": null,
      "new_text": "- One complete factual statement",
      "reason": "Short explanation"
    }
  ]
}

CURRENT MEMORY:
{memory.md}

CANDIDATE FACTS:
{items from extraction}
`