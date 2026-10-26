import type { ModuleDescriptor } from "@/shared/modules";
import { applicationsModule } from "@/modules/applications";
import { atsModule } from "@/modules/ats";
import { candidatesModule } from "@/modules/candidates";
import { chatbotModule } from "@/modules/chatbot";
import { jobAlertsModule } from "@/modules/job-alerts";
import { jobsModule } from "@/modules/jobs";
import { marketingModule } from "@/modules/marketing";
import { matchingModule } from "@/modules/matching";
import { recruitmentModule } from "@/modules/recruitment";

export const MODULES: readonly ModuleDescriptor[] = [
  chatbotModule,
  marketingModule,
  jobsModule,
  candidatesModule,
  applicationsModule,
  jobAlertsModule,
  matchingModule,
  recruitmentModule,
  atsModule,
];
