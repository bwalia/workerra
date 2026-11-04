import { describe, expect, it } from "vitest";
import { parseJobForm } from "./job-form";

const TODAY = "2026-11-04";
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const valid = {
  title: "Warehouse Operative",
  company: "Northern Freight Ltd",
  location: "Leeds",
  employment_type: "full_time",
  workplace: "onsite",
  sector: "logistics",
  salary_min: "£24,000",
  salary_max: "27000",
  salary_period: "year",
  description: "Pick, pack and load orders.",
  responsibilities: "- Pick orders\n• Load vans\n",
  requirements: "Counterbalance licence\n\nRight to work in the UK",
  benefits: "",
  skills: "Forklift, Stock control\nScanning",
  closes_at: "2026-12-01",
};

describe("parseJobForm", () => {
  it("splits a valid form into the ATS job and the listing", () => {
    expect(parseJobForm(form(valid), TODAY)).toEqual({
      ok: true,
      job: { title: "Warehouse Operative", location: "Leeds", employment_type: "full_time", description: "Pick, pack and load orders.", status: "open" },
      listing: {
        company: "Northern Freight Ltd",
        workplace: "onsite",
        sector: "logistics",
        salary_min: 24000,
        salary_max: 27000,
        salary_currency: "GBP",
        salary_period: "year",
        responsibilities: ["Pick orders", "Load vans"],
        requirements: ["Counterbalance licence", "Right to work in the UK"],
        benefits: [],
        skills: ["Forklift", "Stock control", "Scanning"],
        closes_at: "2026-12-01",
      },
    });
  });

  it("leaves pay and closing date out when they're not given", () => {
    const r = parseJobForm(form({ ...valid, salary_min: "", salary_max: "", closes_at: "" }), TODAY);
    expect(r.ok && r.listing).not.toHaveProperty("salary_period");
    expect(r.ok && r.listing).not.toHaveProperty("closes_at");
  });

  it("explains every problem by field", () => {
    const r = parseJobForm(
      form({ ...valid, title: "", sector: "space", salary_min: "lots", salary_max: "1", requirements: "", closes_at: "2026-01-01" }),
      TODAY,
    );
    expect(r.ok ? [] : Object.keys(r.errors).sort()).toEqual(["closes_at", "requirements", "salary_min", "sector", "title"]);
  });

  it("refuses a maximum below the minimum", () => {
    const r = parseJobForm(form({ ...valid, salary_min: "30000", salary_max: "20000" }), TODAY);
    expect(r.ok ? {} : r.errors).toEqual({ salary_max: "The maximum can't be less than the minimum." });
  });
});
