import { z } from "zod";
import { SCHOOL_CODES } from "../../utils/constants.js";
import { requiredText, isoDate, objectId, emailRule, webUrl } from "../../utils/validators.js";
import { APPLICATION_STATUSES } from "./placementApplication.model.js";

export const companySchema = z.object({
  name: requiredText("Company name", 100),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  website: webUrl.optional().or(z.literal("")),
  contactName: z.string().trim().max(80).optional().or(z.literal("")),
  contactEmail: emailRule.optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const jobSchema = z.object({
  companyId: objectId("Company"),
  title: requiredText("Job title", 120),
  type: z.enum(["Full-time", "Internship"]),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  packageLpa: z.coerce.number().min(0).max(1000).optional().or(z.literal("").transform(() => undefined)),
  openings: z.coerce.number().int().min(1).max(10000),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  minCgpa: z.coerce.number().min(0).max(10).default(0),
  schools: z.array(z.enum(SCHOOL_CODES)).default([]),
  deadline: isoDate("Deadline"),
  status: z.enum(["open", "closed"]).default("open"),
});

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES, { message: "Choose a status" }),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});
