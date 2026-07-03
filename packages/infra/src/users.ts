import { prisma } from "@calmstudy/db";

/**
 * Usuário padrão — ponte até a auth (Auth.js) entrar. Foco single-user:
 * todo upload/consulta usa este dono. Quando a auth chegar, troca-se por sessão.
 */
export const DEFAULT_USER_EMAIL = "voce@calmstudy.local";

export async function getOrCreateDefaultUser() {
  return prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: { email: DEFAULT_USER_EMAIL, name: "Você" },
  });
}
