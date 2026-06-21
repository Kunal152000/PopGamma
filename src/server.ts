import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { RequestSchema } from "./schema.js";
import { generateLearningCard } from "./cardService.js";

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true, // structured request logging out of the box
  });

  // Liveness probe — cheap, no LLM call.
  app.get("/health", async () => {
    return { status: "ok" };
  });

  // Main endpoint: { board, grade, concept } -> LearningCard
  app.post("/learning-card", async (request, reply) => {
    // 1) Validate input with the shared Zod schema.
    const parsed = RequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Invalid request body.",
        details: parsed.error.flatten(),
      });
    }

    // 2) Generate the card (LLM call + validation + one retry live in the service).
    try {
      const card = await generateLearningCard(parsed.data);
      return reply.status(200).send(card);
    } catch (err) {
      // The service throws ZodError if the *model output* is malformed,
      // or a plain Error for empty/non-JSON/transport failures.
      if (err instanceof ZodError) {
        request.log.error({ err }, "Model output failed schema validation");
        return reply.status(502).send({
          error: "UpstreamValidationError",
          message: "The model returned data that did not match the card schema.",
        });
      }
      request.log.error({ err }, "Failed to generate learning card");
      return reply.status(502).send({
        error: "GenerationError",
        message: err instanceof Error ? err.message : "Unknown error.",
      });
    }
  });

  return app;
}