---
name: slide-design
description: Rules and workflow for building slide decks that read as human-made, not AI-made. Use when planning, building, or reviewing slides, a deck, a .pptx, or a presentation.
---

# Slide design (no AI tells)

Source: Analyst Academy, *Remove the AI slop from your decks* (Paul Moss, Nov 2026) — `presentation/not-ai-decks-guide.pdf`. A **tell** is a familiar default that makes an audience read a slide as AI-made and stop trusting it. This skill keeps every tell out of the deck.

## Steps

1. **Brief.** Collect: audience, the decision or ask the deck ends on, the data to use (only this), palette/template, output format. For this project the data source is the final report (`docs/รายงานฉบับขอสอบ (Final report)-1852-0.pdf`) and the plan lives in `presentation/`. Done when every field is filled or marked `[DATA NEEDED: …]`.
2. **Storyline.** Write every slide title as a full-sentence **takeaway title** before designing anything. Show the title list to the user. Done when reading only the titles gives the whole argument, and the user has seen it.
3. **Build.** Apply the core rules below to every slide. Reach for [tells.md](tells.md) whenever a slide needs a layout, chart, image, color, or type decision.
4. **Audit.** Run [checklist.md](checklist.md) against every slide, strongest tells first. Render and look at each slide at full size when you can; when you cannot see pixels, say visual checks are unverified. Done when every item passes on every slide, or each failure is fixed or listed for the user with any placeholder left.

## Core rules (every slide)

- **Real data only.** Every number, quote, and example traces to a source you can name. Missing → `[DATA NEEDED: …]` / `[SOURCE NEEDED: …]`. Numbers must match the report exactly.
- **Takeaway title.** One full sentence stating what the slide proves ("ระบบเดิมทั้งสามตัวไม่มีตัวไหนตรวจการชนของตารางสอนได้ครบ"), never a label ("เปรียบเทียบระบบ").
- **One idea, one dominant element.** One number, chart, screenshot, or sentence wins; the title is clearly bigger than the body; everything else is demoted or cut.
- **Title first.** Nothing above the title: no eyebrow label, kicker, breadcrumb, section number, or pill. *(#1 tell, 46% vs 8%.)*
- **Zero slips.** No overlap, overflow, leftover placeholder, word split by wrapping, or title number that disagrees with the slide.
- **Spoken sentences.** Short, plain, active; vary length. Write direct statements instead of colon titles and em-dash pivots.
- **Takeaway lives in the title.** The body carries evidence; a so-what line, if needed, is plain text with no box, fill, or label.
- **Clean edges.** Margins frame the slide; the slide edge stays empty of colored strips.
- **End on the ask.** The last slide states the decision or commitment, with risks placed next to the decision they affect.

## Project adaptations (Thai academic defense)

- **Thai filler words** count as tell 4 alongside the English list: ยกระดับ, ปลดล็อก, ขับเคลื่อน, ไร้รอยต่อ, ครบวงจร, ก้าวล้ำ, พลิกโฉม, ตอบโจทย์ทุกมิติ, อย่างมีประสิทธิภาพ (when no measure follows). Write the measured fact instead.
- **Thai wrapping.** Thai has no spaces between words, so line breaks split words easily: check every title and label line end; keep titles to two lines.
- **Type.** One Thai typeface with Latin glyphs (e.g. Sarabun or Noto Sans Thai), regular and bold, 3–4 sizes; body ≥ 24pt for a projector room.
- **The ask** for a project defense is the semester-2 commitment the committee should hold the team to (what ships, when, how it is tested), not "future prospects".
- **Diagrams from the report** are evidence, not decoration: crop to the part being discussed and mark the point in the accent color.
