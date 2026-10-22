// Every feature module exports one descriptor from its index.ts. The catalogue
// (src/modules/catalogue.ts) drives navigation, placeholder pages and tests.

export type Phase = 1 | 2 | 3 | 4 | 5;

export interface ModuleDescriptor {
  id: string;
  name: string;
  summary: string;
  /** Route the module owns in the app, or null for backend-only modules. */
  basePath: string | null;
  /** Implementation phase from docs/roadmap.md. */
  phase: Phase;
  /** Capabilities that are planned, not yet built. */
  planned: string[];
}
