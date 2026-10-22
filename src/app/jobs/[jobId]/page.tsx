import { notFound } from "next/navigation";

// Job detail route is reserved; it 404s until jobs have a data source.
export default function JobDetailPage() {
  notFound();
}
