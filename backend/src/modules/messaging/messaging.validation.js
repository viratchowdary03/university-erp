import { z } from "zod";
import { objectId, requiredText } from "../../utils/validators.js";

export const startSchema = z.object({ userId: objectId("Person") });
export const sendSchema = z.object({ body: requiredText("Message", 2000) });
