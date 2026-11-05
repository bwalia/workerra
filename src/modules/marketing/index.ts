import type { ModuleDescriptor } from "@/shared/modules";

export const marketingModule: ModuleDescriptor = {
  id: "marketing",
  name: "Marketing website",
  summary: "Landing pages, company information and the Workerra blog.",
  basePath: "/about",
  phase: 1,
  planned: ["Home and landing pages", "About and contact", "Blog with a content source", "SEO metadata and sitemap"],
};

export { About } from "./components/About";
export { Benefits, CallToAction, FeaturedJobs, HomeFaq, HomeHero, HowItWorks, Sectors } from "./components/Home";
export type * from "./types";
