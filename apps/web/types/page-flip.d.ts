// page-flip (StPageFlip) não expõe tipos no build resolvido; usamos uma interface
// própria em book-view.tsx e fazemos cast, então basta declarar o módulo.
declare module "page-flip" {
  export const PageFlip: unknown;
}
