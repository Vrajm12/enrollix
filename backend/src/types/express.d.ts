import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      name: string;
      email: string;
      role: Role;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
