// Makes every model answer with `id` (a string) instead of `_id` and `__v`
export function idPlugin(schema) {
  schema.set("toJSON", {
    versionKey: false,
    transform(doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  });
}
