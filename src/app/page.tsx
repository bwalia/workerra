import { parseJobSearchParams } from "@/modules/jobs";
import { jobSource } from "@/modules/jobs/server";
import { Benefits, CallToAction, FeaturedJobs, HomeFaq, HomeHero, HowItWorks, Sectors } from "@/modules/marketing";
import { logger } from "@/shared/logging";

// Which listings a ring serves depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

const FEATURED_COUNT = 3;

export default async function HomePage() {
  const source = jobSource();
  let featured = null;
  let failed = false;
  if (source) {
    try {
      featured = (await source.search(parseJobSearchParams({}), FEATURED_COUNT)).jobs;
    } catch (err) {
      logger.error("featured jobs unavailable", { error: err });
      failed = true;
    }
  }

  return (
    <>
      <HomeHero />
      <HowItWorks />
      <Benefits />
      <Sectors />
      <FeaturedJobs jobs={featured} failed={failed} />
      <HomeFaq />
      <CallToAction />
    </>
  );
}
