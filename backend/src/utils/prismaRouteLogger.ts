import { Request } from "express";

type PrismaErrorLike = {
  name?: string;
  message?: string;
  code?: string;
  clientVersion?: string;
  meta?: unknown;
  stack?: string;
};

const serializeError = (error: unknown): PrismaErrorLike | Record<string, unknown> => {
  if (error instanceof Error) {
    const prismaError = error as Error & PrismaErrorLike;
    return {
      name: prismaError.name,
      message: prismaError.message,
      code: prismaError.code,
      clientVersion: prismaError.clientVersion,
      meta: prismaError.meta,
      stack: prismaError.stack
    };
  }

  if (error && typeof error === "object") {
    return error as Record<string, unknown>;
  }

  return { message: String(error) };
};

export const logPrismaRouteError = (
  req: Request,
  route: string,
  error: unknown,
  context: Record<string, unknown> = {}
) => {
  // Keep the payload structured for production log ingestion.
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify(
      {
        event: "prisma_route_error",
        route,
        tenantId: req.user?.tenantId ?? null,
        userId: req.user?.id ?? null,
        context,
        error: serializeError(error)
      },
      null,
      2
    )
  );
};

