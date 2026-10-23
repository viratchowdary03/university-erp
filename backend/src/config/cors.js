import { env } from "./env.js";

// CLIENT_URL may hold several addresses separated by commas, e.g. the site and a preview address
const allowed = env.clientUrl.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    // no Origin header = same-origin, curl or a server-to-server call
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};
