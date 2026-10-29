// Publishes Workerra's sample listings to an OpsAPI workspace, through the same
// APIs a recruiter integration would use: the ATS creates each job, then the
// Workerra plugin publishes its listing (marked as a sample, so prod never shows it).
//
//   OPSAPI_URL=http://localhost:4041 OPSAPI_NAMESPACE=workerra OPSAPI_API_KEY=opsk_… \
//     npm run seed:opsapi            (Node 22.18+: runs the TypeScript directly)
//
// The key needs ats + ats_jobs (read, create) and workerra_jobs (read, update):
// docker-compose.opsapi.yml's `bootstrap` service prints one for the local stack.
// Re-running skips listings that already exist. Refuses non-local servers unless
// --allow-remote is passed.
import { createClient } from "@opsapi/client";
import type { WorkerraJobPaths } from "../src/modules/jobs/opsapi-types.ts";
import { SAMPLE_JOBS } from "../src/modules/jobs/sample-jobs.ts";

type Json<T> = { headers: Record<string, unknown>; content: { "application/json": T } };
type Op<Body, Data, Path = never> = {
  parameters: { query?: never; header?: never; cookie?: never } & ([Path] extends [never] ? { path?: never } : { path: Path });
  requestBody: { content: { "application/json": Body } };
  responses: { 200: Json<{ data: Data }>; 201: Json<{ data: Data }> };
};
type Unused = { get?: never; put?: never; post?: never; delete?: never; options?: never; head?: never; patch?: never; trace?: never };
type SeedPaths = WorkerraJobPaths & {
  "/api/v2/ats/jobs": Omit<Unused, "post"> & {
    parameters: { query?: never; header?: never; path?: never; cookie?: never };
    post: Op<{ title: string; location: string; employment_type: string; description: string; status: "open" }, { uuid: string }>;
  };
  "/api/v2/workerra/jobs/{uuid}/listing": Omit<Unused, "put"> & {
    parameters: { query?: never; header?: never; path: { uuid: string }; cookie?: never };
    put: Op<Record<string, unknown>, { uuid: string }, { uuid: string }>;
  };
};

async function main() {
  const { OPSAPI_URL, OPSAPI_NAMESPACE, OPSAPI_API_KEY } = process.env;
  if (!OPSAPI_URL || !OPSAPI_NAMESPACE || !OPSAPI_API_KEY) {
    console.error("Set OPSAPI_URL, OPSAPI_NAMESPACE and OPSAPI_API_KEY.");
    return process.exit(1);
  }
  const host = new URL(OPSAPI_URL).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host) && !process.argv.includes("--allow-remote")) {
    console.error(`${OPSAPI_URL} isn't a local server. Pass --allow-remote to seed it anyway.`);
    return process.exit(1);
  }

  const opsapi = createClient<SeedPaths>({ baseUrl: OPSAPI_URL, token: OPSAPI_API_KEY, namespace: OPSAPI_NAMESPACE });

  const { data: existing } = await opsapi.GET("/api/v2/workerra/jobs", {
    params: { query: { include_samples: "true", per_page: 100 } },
  });
  const listed = new Set(existing!.data.map((job) => `${job.title}|${job.company}`));

  let created = 0;
  for (const job of SAMPLE_JOBS) {
    if (listed.has(`${job.title}|${job.company}`)) {
      console.log(`skip    ${job.title} (already listed)`);
      continue;
    }
    const { data: ats } = await opsapi.POST("/api/v2/ats/jobs", {
      body: { title: job.title, location: job.location, employment_type: job.employmentType, description: job.description, status: "open" },
    });
    const uuid = ats!.data.uuid;
    await opsapi.PUT("/api/v2/workerra/jobs/{uuid}/listing", {
      params: { path: { uuid } },
      body: {
        company: job.company,
        workplace: job.workplace,
        sector: job.sector,
        ...(job.salary && {
          salary_min: job.salary.min,
          salary_max: job.salary.max,
          salary_currency: job.salary.currency,
          salary_period: job.salary.period,
        }),
        responsibilities: job.responsibilities ?? [],
        requirements: job.requirements,
        benefits: job.benefits ?? [],
        skills: job.skills,
        ...(job.closesAt && { closes_at: job.closesAt }),
        sample: true,
      },
    });
    created++;
    console.log(`listed  ${job.title} → /jobs/${uuid}`);
  }
  console.log(`\n${created} listing(s) published, ${SAMPLE_JOBS.length - created} already there.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
