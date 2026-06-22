# AI Collaboration

This document describes how I used AI tools while building the Learning Card Generator —
what I asked for, what worked, where the AI got things wrong, and how I caught and fixed
those issues.

## Tools used

- **Cursor** as the primary editor / pair-programmer (inline edits, multi-file refactors,
  and "explain this error" loops).
- A **frontier chat model** (Claude / GPT) for the more open-ended design discussion —
  mainly sketching the card schema and the retry strategy before writing code.

I treated the AI as a fast first-draft generator and reviewer, but kept the design
decisions (schema shape, error contract, auth model) as mine, and validated every piece of
generated code against what the task actually required.

## How I worked

I broke the build into small, reviewable steps and prompted for one thing at a time rather
than asking for the whole app at once. Roughly:

1. Design the response schema (sections, formulas, worked example, visual).
2. Wrap it in Zod and infer the TypeScript types from it.
3. Build the Fastify route + the LLM service.
4. Add the validate-then-retry loop.
5. Layer in auth (register/login, JWT, hashed passwords).

Keeping each step small made it much easier to spot where the AI drifted from what I wanted.

## Key prompts

A few of the prompts that shaped the project:

- *"Design a JSON schema for a learning card aimed at a Class-9 student that includes LaTeX
  formulas and exactly one structured visual (graph, table, or flowchart) — the visual must
  be data, not an image."*
  This produced the first draft of the card shape and, importantly, the idea of modelling
  the visual as a **tagged union on `type`**, which I kept.

- *"Write Zod schemas for this card and infer the TS types with `z.infer` so the schema is
  the single source of truth."*

- *"The model sometimes returns JSON that doesn't match the schema. Write a service that
  validates the output and, on failure, retries once by feeding the model its own bad
  output plus the validation error."*

- *"Add JWT auth to the `/learning-card` route: register/login endpoints, bcrypt-hashed
  passwords in SQLite, and a pre-handler that returns 401 on a missing/invalid token."*

- Many small Cursor inline prompts like *"map a ZodError on the model output to 502, not
  500"* and *"explain why this Fastify type is complaining."*

## What worked well

- **Schema-first scaffolding.** The AI was good at turning a described shape into Zod
  schemas and wiring up `z.infer`, which gave me typed request/response objects almost for
  free. The discriminated-union suggestion for `visual` was genuinely useful.
- **Boilerplate and glue.** Fastify route setup, the OpenAI-SDK-against-OpenRouter client,
  bcrypt hashing, and the `@fastify/jwt` registration were all generated quickly and
  correctly enough to refine.
- **Error-mapping prose.** It helped me reason through the right status codes (400 vs 401 vs
  409 vs 502) and articulate the "client fault vs upstream fault" distinction that ended up
  in the README.
- **Explaining stack traces.** Pasting a TS or Fastify error back into Cursor and asking
  "why" was usually faster than reading the docs myself.

## Where the AI got it wrong (and how I caught it)

- **Over-trusting the model output.** The first draft of the service just did
  `JSON.parse(...)` and returned it as the typed card — no runtime validation. The types
  *looked* safe but were a lie at runtime. I caught this by reasoning about what happens
  when the LLM adds an extra field or wrong type, and replaced it with
  `LearningCardSchema.parse()` so the schema is enforced at runtime, plus the single retry
  that feeds the error back to the model.

- **LaTeX delimiters in formula fields.** Early outputs wrapped formulas in `$...$` or
  `\(...\)` inside `keyFormulas[].latex`, which would force the frontend to strip
  delimiters. I caught this while eyeballing sample responses and fixed it by adding an
  explicit rule to the system prompt: formula fields contain **raw** LaTeX only, while prose
  fields may use inline `$...$`. (This is a prompt-level rule, not yet schema-enforced — a
  regex check is on the "more time" list.)

- **Unbounded / inconsistent visuals.** Generations sometimes returned graphs with a single
  point or huge tables. I added size caps in both places: the prompt asks for sane limits,
  and the Zod schema enforces hard bounds (e.g. `sampledPoints` `min(2).max(8)`, table
  `columns.max(5)`/`rows.max(6)`). The schema is the real guarantee; the prompt just nudges.

- **Wrong error status codes.** Generated handlers tended to throw generic `500`s. A
  malformed *model* response is an upstream problem, so I changed it to map `ZodError` on
  the model output to `502`, keeping `400` strictly for bad client input.

- **Confidently-wrong / outdated API details.** A few suggestions used Zod or Fastify APIs
  that didn't match the installed versions (e.g. helper names that didn't exist). The
  TypeScript compiler and Cursor's linter caught these immediately, and I corrected them
  against the real package types.

## What I verified myself

Regardless of how a piece of code was produced, I:

- read every file before committing it,
- relied on `tsc` and the linter to catch type/API mistakes,
- hit the endpoints manually (register → login → `/learning-card`) and inspected the JSON
  for valid LaTeX and a renderable visual,
- and made sure the runtime schema — not just the prompt — was the thing guaranteeing the
  contract.

## Takeaway

AI made me considerably faster at scaffolding and boilerplate, and was a useful sounding
board for the schema and error design. Its main failure mode here was **optimism** —
trusting the model's output, dropping runtime validation, and getting small API/formatting
details wrong. The fix was the same theme throughout: keep the AI for drafting, but make
the schema and the type checker the source of truth, and verify the actual responses by
hand.
