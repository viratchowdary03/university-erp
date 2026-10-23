import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/generateToken.js";
import { ACCOUNT_STATUS } from "../utils/constants.js";
import { User } from "../modules/users/user.model.js";

// Requires a valid login token. Sets req.user.
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new ApiError(401, "Please sign in to continue");

  const payload = verifyAccessToken(token); // throws JsonWebTokenError / TokenExpiredError
  const user = await User.findById(payload.sub);
  if (!user || user.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new ApiError(401, "Your session is no longer valid. Please sign in again");
  }
  req.user = user;
  next();
});
