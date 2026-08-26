import { createRoute } from "@hono/zod-openapi";

import {
  apiErrorSchema,
  healthSchema,
  registrationCreatedSchema,
  registrationRequestSchema,
} from "./contracts";

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  operationId: "getHealth",
  tags: ["System"],
  responses: {
    200: {
      description: "The API is available.",
      content: {
        "application/json": { schema: healthSchema },
      },
    },
  },
});

export const createRegistrationRoute = createRoute({
  method: "post",
  path: "/v1/registrations",
  operationId: "createRegistration",
  tags: ["Registrations"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: registrationRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: "The registration was saved.",
      content: {
        "application/json": { schema: registrationCreatedSchema },
      },
    },
    422: {
      description: "The request did not match the registration schema.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    415: {
      description: "The request body is not JSON.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    413: {
      description: "The request body is too large.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
    500: {
      description: "The registration could not be saved.",
      content: {
        "application/json": { schema: apiErrorSchema },
      },
    },
  },
});
