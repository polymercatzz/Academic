---
name: confirm-gate
description: Agree on a change with the user before making it (human-in-the-loop gate). Use when editing slide content, report text, or any wording the user is shaping, or when the user says "ตกลงกันก่อน", "อย่าพึ่งแก้", "คิดดูก่อน", or asks "ควร…ไหม".
---

# Confirm gate

A **gate** stands between proposing a change and writing it. Nothing in the project's files changes until the user has passed the gate for that exact change. Reading, searching, and drafting in chat happen freely before the gate; edits happen only after it.

## Steps

1. **Read the source.** Pull the facts from the report (`docs/รายงานฉบับขอสอบ (Final report)-1852-0.pdf`) and the existing files. Done when every claim in the proposal has a place in the report or the repo, named by section, figure, or file.
2. **Propose.** Show the change in chat, in the shape it will take in the file:
   - Wording choices: 2–4 options in a table, one marked as the recommendation, with one or two reasons.
   - Structure changes: the new outline or the new table, before and after when it helps.
   - Name every knock-on edit the change forces elsewhere (renumbering, highlight boxes, other files) so the user approves the whole set.
   - End with the open decisions as a short numbered list.
   Done when the user can answer with one word per decision.
3. **Wait at the gate.** End the turn. The gate opens only on an answer that settles the open decisions: "โอเค", "เอาแบบ 1", "แก้เลย", or the user's own wording.
4. **Read the answer.** Map it to the decisions:
   - Open decisions that the answer did not address stay open: either carry the recommendation and say so in one line, or ask again. Ask again when the decision changes content the user will read aloud.
   - A short reply that could mean two things ("เอาแบบเดิม", "แบบนั้น") gets a clarifying question with the concrete options, before any edit.
   Done when every decision has an answer or a stated default.
5. **Edit.** Make exactly the agreed changes, all of them, in one pass. Then report what changed, file by file, and what is still open.

## Rules

- **The user's wording wins.** When the user writes their own sentence, polish it toward the report's facts and keep its voice; flag only words that would mislead (a term the report defines differently, a claim the report does not make).
- **Report-bound.** A point the report does not support goes in the proposal with that warning attached, never silently into the file.
- **Reverts are cheap.** When the user says to go back, restore the earlier version exactly, from the text already in the conversation, and keep the parts they did not mention.
- **One gate per change set.** Approval covers what was shown. A new idea that comes up while editing goes back through step 2.
