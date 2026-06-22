import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Login takes the same shape as register.
export const LoginSchema = RegisterSchema;

export const RequestSchema = z.object({
    board: z.string().min(1, "Board is required"),
    grade: z.number().int().min(1).max(12, "Grade must be between 9 to 12"),
    concept: z.string().min(1, "Concept is required")
})

// Learning card response schema
const SectionSchema = z.object({
    heading:z.string(),
    body: z.string()
});
// Formulas schema
const KeyFormulaSchema = z.object({
    latex: z.string(),
    explanation:z.string(),
});
// Worked Example
const WorkedExampleSchema = z.object({
    question: z.string(),
    steps: z.array(z.string()).max(5), // safety cap; prompt asks for <= 4
});

// VisulaSchema
const GraphVisualSchema = z.object({
    type: z.literal("graph"),
    functionLatex: z.string(),
    xRange: z.tuple([z.number(), z.number()]), // [min, max]
    sampledPoints: z.array(z.object({ x: z.number(), y: z.number() })).min(2).max(8),
    xLabel: z.string(),
    yLabel: z.string(),
  });
  const TableVisualSchema = z.object({
    type: z.literal("table"),
    columns: z.array(z.string()).max(5),
    rows: z.array(z.array(z.string())).max(6),
  });
  const FlowchartVisualSchema = z.object({
    type: z.literal("flowchart"),
    nodes: z.array(z.object({ id: z.string(), label: z.string() })).max(8),
    edges: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
      })
    ),
  });

const VisualSchema = z.discriminatedUnion("type", [
    GraphVisualSchema,
    TableVisualSchema,
    FlowchartVisualSchema,
  ]);

export const LearningCardSchema = z.object({
    meta: z.object({
      board: z.string(),
      grade: z.number().int(),
      concept: z.string(),
    }),
    title: z.string(),
    sections: z.array(SectionSchema).min(1).max(4), 
    keyFormulas: z.array(KeyFormulaSchema).max(4), 
    workedExample: WorkedExampleSchema,
    visual: VisualSchema,
  });
  

export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type CardRequest = z.infer<typeof RequestSchema>
export type LearningCard = z.infer<typeof LearningCardSchema>;