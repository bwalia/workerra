// Deployment rings. Mirrors the JobShout ring model (int → test → acc → prod)
// promoted by Ring Promoter. Only prod is reachable without the Workstation VPN;
// the other rings sit behind a wslproxy access profile. See docs/environments.md.

export const APP_ENVS = ["local", "int", "test", "acc", "prod"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export interface Environment {
  id: AppEnv;
  host: string;
  /** Reachable from the public internet without the Workstation VPN. */
  public: boolean;
  /** Search engines may index it. */
  indexable: boolean;
}

export const ENVIRONMENTS: Record<AppEnv, Environment> = {
  local: { id: "local", host: "localhost:3020", public: false, indexable: false },
  int: { id: "int", host: "int.workerra.uk", public: false, indexable: false },
  test: { id: "test", host: "test.workerra.uk", public: false, indexable: false },
  acc: { id: "acc", host: "acc.workerra.uk", public: false, indexable: false },
  prod: { id: "prod", host: "www.workerra.uk", public: true, indexable: true },
};

export function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}
