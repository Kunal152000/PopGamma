import { client, model } from "./llm.js";
import {
  LearningCardSchema,
  type CardRequest,
  type LearningCard,
} from "./schema.js";
const SYSTEM_PROMPT = `You are an expert curriculum designer.

Given board, grade, and concept, return exactly one valid JSON object:

{
  "meta":{"board":string,"grade":number,"concept":string},
  "title":string,
  "sections":[{"heading":string,"body":string}],
  "keyFormulas":[{"latex":string,"explanation":string}],
  "workedExample":{"question":string,"steps":string[]},
  "visual":{}
}

Visual must be exactly one of:

Graph:
{"type":"graph","functionLatex":string,"xRange":[number,number],"sampledPoints":[{"x":number,"y":number}],"xLabel":string,"yLabel":string}

Table:
{"type":"table","columns":string[],"rows":string[][]}

Flowchart:
{"type":"flowchart","nodes":[{"id":string,"label":string}],"edges":[{"from":string,"to":string,"label":string}]}

Rules:
- Return JSON only. No extra fields.
- meta.grade must equal input grade.
- Be concise; favor clarity over length.
- Use exactly 3 sections; each body is 1-2 short sentences (max ~40 words).
- Use 1-3 formulas; each explanation is one short sentence.
- workedExample: max 4 concise steps, one sentence each.
- Choose ONE visual: graph for functions/relationships, table for comparisons/data, flowchart for processes.
- Graph: exactly 5 correct sampled points. Table: max 4 columns and 5 rows. Flowchart: max 6 nodes.
- latex and functionLatex must contain only raw LaTeX expressions (no $, $$, \( \), \[ \], or surrounding text).
- body and explanation may contain inline math using $...$.`;

function buildUserPrompt(req: CardRequest): string {
    return `Board: ${req.board}
  Grade: ${req.grade}
  Concept: ${req.concept} 

  Generate the learning card JSON now.`;
  }

async function callModel(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<string> {
    const t0 = performance.now();
    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.4,
      // Hard ceiling on output size: a compressed card needs well under this,
      // so it bounds worst-case latency without truncating valid responses.
      max_tokens: 1200,
    });
    const t1 = performance.now();
    console.log(`LLM call took ${t1 - t0} milliseconds`);
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned an empty response.");
    }
    return content;
  }

// LLM response validation
function parseCard(raw: string): LearningCard {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("Response was not valid JSON.");
    }
    return LearningCardSchema.parse(json); // throws ZodError if shape is wrong
  }

export async function generateLearningCard(req: CardRequest): Promise<LearningCard> {
    const baseMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: buildUserPrompt(req) },
    ];

    // First attempt
    const firstRaw = await callModel(baseMessages);
    try {
      return parseCard(firstRaw);
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
  
      // Second (final) attempt: show the model its bad output + the error
      const retryRaw = await callModel([
        ...baseMessages,
        { role: "assistant" as const, content: firstRaw },
        {
          role: "user" as const,
          content: `Your previous response failed validation with this error:\n${errorDetail}\n\nReturn a corrected JSON object that strictly matches the required schema. Return ONLY the JSON.`,
        },
      ]);
      try {
        return parseCard(retryRaw);
      } catch (retryErr) {
        const retryDetail = retryErr instanceof Error ? retryErr.message : String(retryErr);
        throw new Error(`LLM failed to produce a valid learning card after retry: ${retryDetail}`);
      }
    }
  }