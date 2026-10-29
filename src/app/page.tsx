import { searchJobs, parseJobSearchParams } from "@/modules/jobs";
import { listJobs } from "@/modules/jobs/server";
import { Benefits, CallToAction, FeaturedJobs, HomeFaq, HomeHero, HowItWorks } from "@/modules/marketing";

// Which listings a ring serves depends on runtime env (one image per ring), so never prerender.
export const dynamic = "force-dynamic";

const FEATURED_COUNT = 3;

export default function HomePage() {
  const jobs = listJobs();
  const featured = jobs ? searchJobs(jobs, parseJobSearchParams({}), FEATURED_COUNT).jobs : null;

  return (
    <>
      <HomeHero />
      <HowItWorks />
      <Benefits />
      <FeaturedJobs jobs={featured} />
      <HomeFaq />
      <CallToAction />
    </>
  );
}
