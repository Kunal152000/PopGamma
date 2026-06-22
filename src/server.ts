import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
// import "@fastify/jwt";
import fastifyJwt from "@fastify/jwt";
import { ZodError } from "zod";
import { RequestSchema,RegisterSchema,LoginSchema } from "./schema.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { generateLearningCard } from "./cardService.js";
import {
    createUser,
    verifyUser,
    EmailAlreadyExistsError,
  } from "./userStore.js";
export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true, // structured request logging out of the box
  });
const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set.");
  }
app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "1h" },
  });
  // Liveness probe — cheap, no LLM call.
  app.get("/health", async () => {
    return { status: "ok" };
  });

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Missing or invalid authentication token.",
      });
    }
  }
  // Register a new user.
  app.post("/register", async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Invalid request body.",
        details: z.flattenError(parsed.error),
      });
    }
    try {
      const user = await createUser(parsed.data.email, parsed.data.password);
      const token = await reply.jwtSign({ sub: user.id, email: user.email });
      return reply.status(201).send({ token });
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        return reply.status(409).send({
          error: "EmailAlreadyExists",
          message: "An account with this email already exists.",
        });
      }
      request.log.error({ err }, "Failed to register user");
      return reply.status(500).send({
        error: "InternalError",
        message: "Could not create the account.",
      });
    }
  });

// Log in an existing user.
app.post("/login", async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Invalid request body.",
        details: z.flattenError(parsed.error),
      });
    }
    const user = await verifyUser(parsed.data.email, parsed.data.password);
    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid credentials.",
      });
    }
    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return reply.status(200).send({ token });
});

  // Main endpoint: { board, grade, concept } -> LearningCard
  app.post("/learning-card",{ preHandler: authenticate }, async (request, reply) => {
    // 1) Validate input with the shared Zod schema.
    const parsed = RequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "ValidationError",
        message: "Invalid request body.",
        details: z.flattenError(parsed.error),
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

