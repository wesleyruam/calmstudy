import "server-only";
import bcrypt from "bcryptjs";

// Hash de senha (bcrypt puro-JS; sem build nativo). Custo 10 é suficiente aqui.
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
