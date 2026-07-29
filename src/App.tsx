import { useEffect, useMemo, useState } from "react";

const ITEMS_PER_PAGE = 10;

// Keep labels and their TypeScript unions backed by one source of truth.
const TYPE_LABELS = {
  interest: "Interest",
  principal: "Principal",
  investment: "Investment",
  go_grow: "Go & Grow",
} as const;

const STATUS_LABELS = {
  completed: "Completed",
  pending: "Pending",
} as const;

type TransactionType = keyof typeof TYPE_LABELS;
type TransactionStatus = keyof typeof STATUS_LABELS;
type Filter<T extends string> = T | "all";
type SortKey = "date" | "amount";
type SortDirection = "asc" | "desc";

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
};

type Sort = {
  key: SortKey;
  direction: SortDirection;
};

const transactionTypes = Object.keys(TYPE_LABELS) as TransactionType[];
const transactionStatuses = Object.keys(STATUS_LABELS) as TransactionStatus[];

// Reuse one formatter instead of constructing one for every rendered amount.
const currencyFormatter = new Intl.NumberFormat("ee-EE", {
  style: "currency",
  currency: "EUR",
});

function filterAndSortTransactions(
  transactions: readonly Transaction[],
  typeFilter: Filter<TransactionType>,
  statusFilter: Filter<TransactionStatus>,
  searchQuery: string,
  sort: Sort,
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  // Filter in one pass, then sort the derived copy without mutating source data.
  const filtered = transactions.filter(
    (transaction) =>
      (typeFilter === "all" || transaction.type === typeFilter) &&
      (statusFilter === "all" || transaction.status === statusFilter) &&
      transaction.description.toLocaleLowerCase().includes(normalizedQuery),
  );

  return filtered.toSorted((a, b) => {
    // ISO YYYY-MM-DD strings sort chronologically without allocating Date objects.
    const comparison =
      sort.key === "date"
        ? a.date.localeCompare(b.date)
        : a.amount - b.amount;

    return sort.direction === "asc" ? comparison : -comparison;
  });
}

function summarizeTransactions(transactions: readonly Transaction[]) {
  // Derive all summary values in one traversal and show outflow as a magnitude.
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.amount > 0) totals.totalIn += transaction.amount;
      if (transaction.amount < 0) totals.totalOut -= transaction.amount;
      totals.netTotal += transaction.amount;
      return totals;
    },
    { totalIn: 0, totalOut: 0, netTotal: 0 },
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] =
    useState<Filter<TransactionType>>("all");
  const [statusFilter, setStatusFilter] =
    useState<Filter<TransactionStatus>>("all");
  const [sort, setSort] = useState<Sort>({
    key: "date",
    direction: "desc",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/transactions.json", {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const transactions: Transaction[] = await response.json();
        setData(transactions);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        console.error("Error fetching data:", error);
        setError(
          error instanceof Error
            ? error
            : new Error("Unable to load transactions"),
        );
      } finally {
        // Avoid stale loading updates when Strict Mode aborts the first request.
        if (!abortController.signal.aborted) setIsLoading(false);
      }
    }

    void fetchData();
    return () => abortController.abort();
  }, []);

  const filteredAndSorted = useMemo(
    () =>
      filterAndSortTransactions(
        data,
        typeFilter,
        statusFilter,
        searchQuery,
        sort,
      ),
    [data, typeFilter, statusFilter, searchQuery, sort],
  );

  const totals = useMemo(
    () => summarizeTransactions(filteredAndSorted),
    [filteredAndSorted],
  );

  const pageCount = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE,
    );
  }, [filteredAndSorted, currentPage]);

  function updateTypeFilter(value: Filter<TransactionType>) {
    setTypeFilter(value);
    setCurrentPage(1);
  }

  function updateStatusFilter(value: Filter<TransactionStatus>) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  function toggleSort(key: SortKey) {
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === "asc"
          ? "desc"
          : "asc",
    }));
    setCurrentPage(1);
  }

  function ariaSort(key: SortKey): "ascending" | "descending" | "none" {
    if (sort.key !== key) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  }

  if (isLoading) {
    return <h1>Loading transactions…</h1>;
  }

  if (error) {
    return <h1 role="alert">Error: {error.message}</h1>;
  }

  return (
    <main>
      <h1>Transactions</h1>

      <section aria-label="Filtered transaction summary">
        <h2>Total in: {currencyFormatter.format(totals.totalIn)}</h2>
        <h2>Total out: {currencyFormatter.format(totals.totalOut)}</h2>
        <h2>Net total: {currencyFormatter.format(totals.netTotal)}</h2>
      </section>

      <section aria-label="Transaction filters">
        <label>
          Search description
          <input
            type="search"
            placeholder="Search…"
            value={searchQuery}
            // Filtering 48 local rows immediately is simpler and more responsive than debouncing.
            onChange={(event) => {
              setSearchQuery(event.currentTarget.value);
              setCurrentPage(1);
            }}
          />
        </label>

        <label>
          Type
          <select
            value={typeFilter}
            onChange={(event) =>
              updateTypeFilter(
                event.currentTarget.value as Filter<TransactionType>,
              )
            }
          >
            <option value="all">All types</option>
            {transactionTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              updateStatusFilter(
                event.currentTarget.value as Filter<TransactionStatus>,
              )
            }
          >
            <option value="all">All statuses</option>
            {transactionStatuses.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <table>
        <caption>Transactions matching the selected filters</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort("date")}>
              <button type="button" onClick={() => toggleSort("date")}>
                Date {sort.key === "date" && (sort.direction === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th scope="col">Type</th>
            <th scope="col">Description</th>
            <th scope="col" aria-sort={ariaSort("amount")}>
              <button type="button" onClick={() => toggleSort("amount")}>
                Amount{" "}
                {sort.key === "amount" &&
                  (sort.direction === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={5}>No transactions match your filters.</td>
            </tr>
          ) : (
            paginatedData.map((transaction) => (
              <tr key={transaction.id}>
                <td>
                  <time dateTime={transaction.date}>{transaction.date}</time>
                </td>
                <td>{TYPE_LABELS[transaction.type]}</td>
                <td>{transaction.description}</td>
                <td>{currencyFormatter.format(transaction.amount)}</td>
                <td>{STATUS_LABELS[transaction.status]}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pageCount > 0 && (
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={setCurrentPage}
        />
      )}
    </main>
  );
}

function Pagination({
  currentPage,
  pageCount,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  // Prev/next plus one indicator stays compact regardless of result count.
  return (
    <nav aria-label="Transaction pages">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span aria-live="polite">
        Page {currentPage} of {pageCount}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === pageCount}
      >
        Next
      </button>
    </nav>
  );
}

export default App;
