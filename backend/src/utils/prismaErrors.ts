type PrismaLikeError = {
  code?: string;
  meta?: { table?: string };
};

export const isMissingApiRequestLogTableError = (error: unknown): boolean => {
  const prismaError = error as PrismaLikeError;
  return prismaError?.code === "P2021" && prismaError?.meta?.table === "public.api_request_logs";
};
