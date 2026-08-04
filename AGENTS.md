# Academic Report Project Instructions

Before designing or changing any UI in this repository:

1. Read `STYLE_GUIDE.md`.
2. Inspect the existing page and reuse its components, spacing, typography, colors, borders, and interaction patterns.
3. Treat this as a quiet, task-focused school reporting system, not a marketing website.

## UI Copy Rules

- Do not add subtitles, helper text, notes, kickers, or feature explanations by default.
- Add explanatory copy only when it prevents a likely mistake, explains a calculation or consequence, communicates validation, or provides essential scope such as room, subject, semester, or date range.
- Do not repeat information already visible in a heading, label, selected filter, metric, or table column.
- Prefer short noun labels for fields and clear command labels for buttons.
- Keep empty-state copy concise: state what is missing and the next useful condition only.
- Remove action footers when filters already apply automatically. Do not show redundant Search or Reset buttons for auto-applied filters.

## Report Layout Rules

- For reports that load a meaningful default dataset, use this order: summary, filters, detail table.
- Keep the summary focused on decision-making metrics, trends, and exceptions.
- Keep filters compact and place table-specific controls next to the table.
- Do not add cards, descriptions, filters, or actions unless they materially help the user's task.

## Change Discipline

- Preserve the established theme and component system.
- Avoid unrelated refactors.
- Verify desktop, tablet, and mobile behavior after UI changes.
