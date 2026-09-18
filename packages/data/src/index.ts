export const VERSION = "0.1.0";

export type { DataError } from "./errors.js";
export {
  BundleHashMismatchError,
  BundleParseError,
  BundleShapeError,
  DataValidationError,
} from "./errors.js";
export type {
  Bundle,
  BundleModelPlan,
  BundleModelRecord,
  BundlePayload,
  BudgetClass,
  DataSet,
  ModelPlan,
  ModelRecord,
  OverrideRecord,
  PhaseRecord,
  RuntimeRecord,
  SubscriptionPlan,
  SubscriptionRecord,
  Threshold,
} from "./types.js";
export { deriveBudgetClass } from "./budget-class.js";
export { buildBundle, hashPayload, loadBundle } from "./bundle.js";
export { canonicalJson } from "./canonical.js";
export { checkCrossFileIntegrity } from "./integrity.js";
export {
  validateModel,
  validateOverride,
  validatePhases,
  validateRuntime,
  validateSubscription,
} from "./validate.js";
export {
  parseYaml,
  readYamlFile,
  resolveContainedPath,
  YamlLoadError,
} from "./yaml.js";
