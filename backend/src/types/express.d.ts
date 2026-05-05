import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      tenantId: number;
      name: string;
      email: string;
      role: Role;
    }

    interface Request {
      user?: UserPayload;
      cookies?: Record<string, string>;
      nonce?: string;
    }
  }
}

export {};
