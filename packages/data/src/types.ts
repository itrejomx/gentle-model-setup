export type BudgetClass = "sniper" | "semi" | "workhorse" | "volume";

export interface Threshold {
  class: BudgetClass;
  max: number | null;
}
