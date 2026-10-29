// Site navigation, shared by the header and footer so they never drift apart.

export interface NavLink {
  href: string;
  label: string;
}

export const MAIN_NAV: readonly NavLink[] = [
  { href: "/jobs", label: "Jobs" },
  { href: "/candidates", label: "Candidates" },
  { href: "/recruiters", label: "Recruiters" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export const FOOTER_NAV: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Find work",
    links: [
      { href: "/jobs", label: "Browse jobs" },
      { href: "/alerts", label: "Job alerts" },
      { href: "/applications", label: "Applications" },
      { href: "/candidates", label: "Candidate profile" },
    ],
  },
  {
    title: "Hire",
    links: [
      { href: "/recruiters", label: "For recruiters" },
      { href: `/chat?q=${encodeURIComponent("Help me write a job brief")}`, label: "Write a job brief" },
    ],
  },
  {
    title: "Workerra",
    links: [
      { href: "/chat", label: "Assistant" },
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
    ],
  },
];

/** "/jobs" is active on /jobs and /jobs/123, but not on /jobsearch. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
