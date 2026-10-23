import { ApiError } from "../utils/ApiError.js";

// validate(schema) checks req.body with a Zod schema and replaces it with the clean result
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const friendly = (issue) =>
      issue.code === "invalid_union_discriminator" ? "Choose a valid role" : issue.message;
    const errors = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${friendly(i)}`);
    return next(new ApiError(400, friendly(result.error.issues[0]) || "Invalid request", errors));
  }
  req.body = result.data;
  next();
};
