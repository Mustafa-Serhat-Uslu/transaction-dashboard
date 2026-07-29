// Keep labels and their TypeScript unions backed by one source of truth.
export const TYPE_LABELS = {
  interest: "Interest",
  principal: "Principal",
  investment: "Investment",
  go_grow: "Go & Grow",
} as const;

export const STATUS_LABELS = {
  completed: "Completed",
  pending: "Pending",
} as const;

export type TransactionType = keyof typeof TYPE_LABELS;
export type TransactionStatus = keyof typeof STATUS_LABELS;

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
};
