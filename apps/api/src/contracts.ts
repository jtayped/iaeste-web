import { z } from "@hono/zod-openapi";

import { DEGREE_OPTIONS } from "@repo/constants/studies";

import { API_VERSION } from "./version";

export const registrationRequestSchema = z
  .object({
    name: z.string().trim().min(2).openapi({ example: "Joan" }),
    surnames: z.string().trim().min(2).openapi({ example: "Garcia Serra" }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine((email) => {
        const domain = email.split("@").at(-1);
        return domain === "udl.cat" || domain?.endsWith(".udl.cat") === true;
      })
      .openapi({ example: "joan@alumnes.udl.cat" }),
    phone: z.string().trim().min(1).openapi({ example: "+34 623 32 42 34" }),
    degree: z
      .enum(DEGREE_OPTIONS)
      .openapi({ example: "Grau en Informàtica (Lleida)" }),
    year: z.number().int().min(1).max(6).openapi({ example: 2 }),
    previousMember: z.boolean().openapi({ example: false }),
    note: z.string().trim().max(2_000).optional().openapi({
      example: "M'interessen els intercanvis internacionals.",
    }),
  })
  .openapi("RegistrationRequest");

export const registrationCreatedSchema = z
  .object({
    status: z.literal("created"),
  })
  .openapi("RegistrationCreated");

export const validationIssueSchema = z
  .object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  })
  .openapi("ValidationIssue");

export const apiErrorSchema = z
  .object({
    error: z.object({
      code: z.enum([
        "VALIDATION_ERROR",
        "UNSUPPORTED_MEDIA_TYPE",
        "PAYLOAD_TOO_LARGE",
        "NOT_FOUND",
        "INTERNAL_ERROR",
      ]),
      message: z.string(),
      details: z.array(validationIssueSchema).optional(),
    }),
    requestId: z.string(),
  })
  .openapi("ApiError");

export const healthSchema = z
  .object({
    status: z.literal("ok"),
    version: z.literal(API_VERSION),
  })
  .openapi("Health");
