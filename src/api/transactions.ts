import type { Transaction } from "../types/transaction";

export async function fetchTransactions(
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const response = await fetch("/transactions.json", { signal });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<Transaction[]>;
}
