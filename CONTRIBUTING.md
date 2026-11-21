# Contributing

## Before editing

1. Use Node 22 or later and run `npm install`.
2. Copy `.env.example` to `.env.local` only when local configuration is needed.
   Do not add real credentials to that file or commit it.
3. Run `npm run build` and `npm test` before opening a pull request.

## Content and design

- Keep copy factual and specific to information approved by Megabase Infratech.
- Do not add prices, RERA identifiers, availability, completion claims or
  testimonials unless supplied and approved.
- Preserve the homepage's quiz-only hero and the final-step-only construction
  contact collection.
- Treat the Bhumi Residency template as reusable project infrastructure; keep
  project facts in `content/project-data.mjs`.

## Code

- Prefer small modules with a single responsibility.
- Keep server-side secrets and database access out of browser code.
- Maintain keyboard access, visible focus states, descriptive image text and
  direct-route rendering for every public page.
- Add or update tests whenever validation, routing, content generation or lead
  storage behaviour changes.
