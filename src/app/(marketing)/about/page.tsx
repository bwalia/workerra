import type { Metadata } from "next";
import { About, CallToAction } from "@/modules/marketing";

export const metadata: Metadata = {
  title: "About",
  description: "Why Workerra exists, how it works and what it values, and what you can use on the site today.",
};

export default function AboutPage() {
  return (
    <>
      <About />
      <CallToAction />
    </>
  );
}
