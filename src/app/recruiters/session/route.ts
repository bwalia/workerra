import { handleSessionRenewal } from "@/modules/recruitment/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleSessionRenewal;
