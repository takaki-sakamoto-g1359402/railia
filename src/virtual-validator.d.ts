declare module "virtual:character-action-validator" {
  const validate: import("ajv").ValidateFunction<unknown>;
  export default validate;
}
