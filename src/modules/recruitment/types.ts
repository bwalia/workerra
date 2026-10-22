export interface RecruiterOrganisation {
  id: string;
  name: string;
  website: string | null;
}

export interface Recruiter {
  id: string;
  userId: string;
  organisationId: string;
  fullName: string;
  title: string | null;
}
