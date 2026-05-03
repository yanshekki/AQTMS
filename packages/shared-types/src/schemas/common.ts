import { z } from 'zod';

// Generic pagination params
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// Generic API error response
export const ApiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(z.record(z.unknown())).optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// Generic API success wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string(),
  });

// Generic validate function (safeParse with type narrowing)
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
