import { z } from "zod";

const decisionSchema = z.enum([
  "allow",
  "deny",
  "charge",
  "throttle",
  "review",
  "redirect_to_api",
  "human_only"
]);

export const rateLimitSchema = z.object({
  requests: z.number().int().positive(),
  window: z.string().min(1),
  burst: z.number().int().positive().optional(),
  respectRetryAfter: z.boolean().optional()
});

export const paymentSchema = z.object({
  type: z.string().min(1),
  settlement: z.string().optional(),
  network: z.string().optional(),
  scheme: z.string().optional(),
  asset: z.string().optional(),
  assetId: z.union([z.string(), z.number()]).optional(),
  assetIdEnv: z.string().optional(),
  payTo: z.string().optional(),
  payToEnv: z.string().optional(),
  facilitatorUrl: z.string().url().optional(),
  facilitatorUrlEnv: z.string().optional()
});

export const agentAccessRuleSchema = z.object({
  id: z.string().min(1),
  match: z.object({
    methods: z.array(z.string().min(1)).optional(),
    paths: z.array(z.string().min(1)).optional()
  }).optional(),
  decision: decisionSchema,
  purposes: z.array(z.string()).optional(),
  deniedPurposes: z.array(z.string()).optional(),
  uses: z.array(z.string()).optional(),
  allowedUses: z.array(z.string()).optional(),
  deniedUses: z.array(z.string()).optional(),
  rateLimit: rateLimitSchema.optional(),
  loadPolicy: z.object({
    maxRps: z.number().positive().optional(),
    preferredWindows: z.array(z.string()).optional(),
    preferBulkEndpoint: z.boolean().optional(),
    emergencyStop: z.string().url().optional()
  }).optional(),
  attribution: z.object({
    required: z.boolean().optional(),
    format: z.string().optional()
  }).optional(),
  retention: z.object({
    maxAge: z.string().optional(),
    allowEmbedding: z.boolean().optional()
  }).optional(),
  training: z.boolean().optional(),
  summarisation: z.boolean().optional(),
  summarization: z.boolean().optional(),
  indexing: z.boolean().optional(),
  quoteLimit: z.object({
    maxWords: z.number().int().positive().optional(),
    maxCharacters: z.number().int().positive().optional()
  }).optional(),
  price: z.object({
    amount: z.string(),
    currency: z.string(),
    unit: z.string().optional()
  }).optional(),
  payment: paymentSchema.optional(),
  receipt: z.object({
    required: z.boolean().optional(),
    signing: z.string().optional()
  }).optional(),
  redirectTo: z.string().url().optional(),
  expiresAt: z.string().optional(),
  jurisdiction: z.string().optional(),
  reviewUrl: z.string().url().optional()
});

export const agentAccessPolicySchema = z.object({
  version: z.string().min(1),
  protocol: z.literal("open-agent-access"),
  site: z.object({
    name: z.string().min(1),
    origin: z.string().url(),
    contact: z.string().optional(),
    securityContact: z.string().optional(),
    terms: z.string().url().optional()
  }),
  defaults: z.object({
    decision: decisionSchema.optional(),
    respectRobotsTxt: z.boolean().optional(),
    requireAgentIdentity: z.boolean().optional(),
    requirePurpose: z.boolean().optional(),
    requireReceipt: z.boolean().optional()
  }).optional(),
  rules: z.array(agentAccessRuleSchema),
  paidAccess: z.unknown().optional(),
  x402: z.unknown().optional(),
  algorand: z.unknown().optional(),
  receipt: z.object({
    required: z.boolean().optional(),
    signing: z.string().optional()
  }).optional(),
  expiresAt: z.string().optional(),
  jurisdiction: z.string().optional(),
  reviewUrl: z.string().url().optional()
});
