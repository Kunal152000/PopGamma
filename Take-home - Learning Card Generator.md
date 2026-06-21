# PopGamma — Technical Take-home: Learning Card Generator

Thanks for moving to the technical step! This is a small build task to look at before our 30–45 min technical call. **Time-box it to ~2–3 hours** — we care more about clean structure and good design decisions than about features. If you don't finish, just ship what you have and add notes.

## The task

Build a small backend in **TypeScript + Node.js (Fastify preferred)** with one main endpoint:

```
POST /learning-card
{ "board": "CBSE", "grade": 9, "concept": "Slope-intercept form of a line (y = mx + c)" }
```

It should use an LLM (Claude / GPT / Gemini — your choice) to generate a **learning card** that teaches this concept to a **Class-9 child**, and return it in a form a **frontend could render**.

## Requirements (hard)

- The card must include **mathematical notation (LaTeX)** and **at least one visual** (e.g. a curve/graph, a table, or a flowchart).
- The visual should be **structured data the frontend can render — not a pre-rendered image**.
- The output should be clean and reliable enough for a frontend to consume.
- Backend only — no UI needed; returning the generated card is enough.

## Your design decisions (intentionally open)

**What sections the card contains, how you represent the LaTeX, and how you structure the visual are entirely up to you.** We're not giving you a schema on purpose — we want to see how *you* design it.

## Also include (this part interests us a lot)

An **`AI_COLLABORATION.md`** describing how you used AI tools (Claude, ChatGPT, Cursor, Claude Code…) to build this: your key prompts, what worked well, where the AI got it wrong, and how you caught and fixed it.

## Deliverables

- A **GitHub repo**.
- A short **README**: setup/run instructions, your key design choices & trade-offs, and "what I'd do with more time".
- The **`AI_COLLABORATION.md`**.

Please share the repo link before the call. Looking forward to seeing what you build!
