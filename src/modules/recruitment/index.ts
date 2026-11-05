import type { ModuleDescriptor } from "@/shared/modules";

export const recruitmentModule: ModuleDescriptor = {
  id: "recruitment",
  name: "Recruitment",
  summary: "Recruiter workspace: post jobs, review applicants and run hiring workflows.",
  basePath: "/recruiters",
  phase: 3,
  planned: ["Recruiter and organisation accounts", "Post and manage jobs", "Applicant review", "AI shortlists from matching"],
};

export { PostJobForm } from "./components/PostJobForm";
export { PostJobPage, RecruiterDashboard, RecruiterJob, RecruiterLanding } from "./components/RecruiterViews";
export { SignInForm } from "./components/SignInForm";
export type * from "./types";
