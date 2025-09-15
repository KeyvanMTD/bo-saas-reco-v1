import { z } from "zod";

export const RuleSchema = z.object({
  _id: z.string(),
  tenant: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(["draft","active","paused","archived"]),
  priority: z.number(),
  kind_scope: z.array(z.enum(["similar","complementary","x-sell"]).optional()).optional().transform(v=>v?.filter(Boolean) as ("similar"|"complementary"|"x-sell")[]|undefined),
  target: z.object({
    category_path: z.array(z.string()).optional(),
    product_ids: z.array(z.string()).optional(),
    audience: z.record(z.any()).optional()
  }).optional(),
  constraints: z.object({
    include_only: z.object({
      in_stock: z.boolean().optional(),
      min_price: z.number().nullable().optional(),
      max_price: z.number().nullable().optional(),
    }).optional(),
    exclude: z.object({
      brands: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      product_ids: z.array(z.string()).optional(),
      vendors: z.array(z.string()).optional(),
    }).optional()
  }).optional(),
  ranking: z.object({
    boosts: z.array(z.object({
      field: z.string(),
      op: z.enum(["eq","neq","gte","lte","gt","lt"]),
      value: z.any(),
      weight: z.number(),
    })).optional(),
    penalties: z.array(z.object({
      field: z.string(),
      op: z.enum(["eq","neq","gte","lte","gt","lt"]),
      value: z.any(),
      weight: z.number(),
    })).optional(),
  }).optional(),
  overrides: z.object({
    pins: z.array(z.string()).optional(),
    blocklist: z.array(z.string()).optional(),
  }).optional(),
  diversity: z.object({
    by: z.enum(["brand","category"]).optional(),
    max_per_group: z.number().optional(),
  }).optional(),
  schedule: z.object({
    start_at: z.string().datetime().optional(),
    end_at: z.string().datetime().nullable().optional(),
    days_of_week: z.array(z.number()).optional(),
    timezone: z.string().optional(),
  }).optional(),
  labels: z.array(z.string()).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  created_by: z.string().optional(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const RuleCreateInputSchema = RuleSchema.omit({
  _id: true, created_at: true, updated_at: true
}).extend({
  tenant: z.literal("la_redoute")
});
export type RuleCreateInput = z.infer<typeof RuleCreateInputSchema>;

export const RecoItemSchema = z.object({
  product_id: z.string(),
  name: z.string().optional(),
  image_url: z.string().optional(),
  price: z.number().optional(),
  brand: z.string().optional(),
  score: z.number().optional(),
  rank: z.number().optional(),
});
export type RecoItem = z.infer<typeof RecoItemSchema>;

export const PreviewResponseSchema = z.object({
  before: z.array(RecoItemSchema),
  after: z.array(RecoItemSchema),
  diffs: z.array(z.object({
    product_id: z.string(),
    change: z.enum(["pinned","blocked","boosted","penalized","moved"]),
    delta: z.number().optional(),
    from: z.number().optional(),
    to: z.number().optional(),
  })).optional(),
});
export type PreviewResponse = z.infer<typeof PreviewResponseSchema>;


