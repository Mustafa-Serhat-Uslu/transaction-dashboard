import { useCallback, useEffect, useMemo, useState } from "react";
// import "./App.css";

// fetch data from api and display it in a table X
// add sums X
// add filtering and sorting functionality to the data X
// add pagination to the table X
// add a search bar to filter the data X
// styles X

// Color pos and neg amounts
// add prev next buttons

const itemsPerPage = 5;

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "interest" | "principal" | "investment" | "go_grow";
  status: "pending" | "completed";
};

// WRONG
function filterTransactionsByType(
  data: Transaction[],
  filterByType: "all" | "interest" | "principal" | "investment" | "go_grow",
): Transaction[] {
  if (filterByType === "interest") {
    return data.filter((item) => item.type === "interest");
  }
  if (filterByType === "principal") {
    return data.filter((item) => item.type === "principal");
  }
  if (filterByType === "investment") {
    return data.filter((item) => item.type === "investment");
  }
  if (filterByType === "go_grow") {
    return data.filter((item) => item.type === "go_grow");
  }
  return data;
}

function filterTransactionsByStatus(
  data: Transaction[],
  filterByStatus: "all" | "pending" | "completed",
): Transaction[] {
  if (filterByStatus === "pending") {
    return data.filter((item) => item.status === "pending");
  }
  if (filterByStatus === "completed") {
    return data.filter((item) => item.status === "completed");
  }
  return data;
}

const currencyFormatter = (amount: number) =>
  new Intl.NumberFormat("ee-EE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [data, setData] = useState<Transaction[]>([]);
  const [filterByType, setFilterByType] = useState<
    "all" | "interest" | "principal" | "investment" | "go_grow"
  >("all");
  const [filterByStatus, setFilterByStatus] = useState<
    "all" | "pending" | "completed"
  >("all");
  const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const [currPage, setCurrPage] = useState(1);

  // Called (already debounced) by SearchInput once typing pauses, so App
  // only re-renders once per pause instead of on every keystroke.
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrPage(1);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/transactions.json", {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setData(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Error fetching data:", error);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      // Cleanup function to abort the fetch request if the component unmounts
      abortController.abort();
    };
  }, []);

// FILTER, SEARCH, SORT in that order
  const filteredSorted = useMemo(() => {
    const byType = filterTransactionsByType(data, filterByType);
    const byStatus = filterTransactionsByStatus(byType, filterByStatus);

    // do a search filter on the description field
    const searched = byStatus.filter((item) =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const sorted = searched.toSorted((a, b) => {
      if (dateSortOrder === "asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return sorted;
  }, [data, filterByType, filterByStatus, dateSortOrder, searchQuery]);

  const amountOfPages = Math.ceil(filteredSorted.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currPage - 1) * itemsPerPage;
    return filteredSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSorted, currPage]);

  const totalIn = useMemo(
    () =>
      filteredSorted.reduce(
        (sum, item) => (item.amount > 0 ? sum + item.amount : sum),
        0,
      ),
    [filteredSorted],
  );

  const totalOut = useMemo(
    () =>
      filteredSorted.reduce(
        (sum, item) => (item.amount < 0 ? sum + item.amount : sum),
        0,
      ),
    [filteredSorted],
  );

  const netTotal = useMemo(
    () => filteredSorted.reduce((sum, item) => sum + item.amount, 0),
    [filteredSorted],
  );

  if (isLoading) {
    return <h2>Loading...</h2>;
  }

  if (error) {
    return <h2>Error: {error.message}</h2>;
  }

  return (
    <>
      <h2>TOTAL IN: {currencyFormatter(totalIn)}</h2>
      <h2>TOTAL OUT: {currencyFormatter(totalOut)}</h2>
      <h2>NET TOTAL: {currencyFormatter(netTotal)}</h2>

      <SearchInput onSearch={handleSearch} />

      <select
        id="filter-by-type"
        value={filterByType}
        onChange={(e) => {
          setCurrPage(1);
          setFilterByType(e.target.value as Transaction["type"] | "all");
        }}
      >
        <option value="all">All</option>
        <option value="interest">Interest</option>
        <option value="principal">Principal</option>
        <option value="investment">Investment</option>
        <option value="go_grow">Go Grow</option>
      </select>

      <select
        id="filter-by-status"
        value={filterByStatus}
        onChange={(e) => {
          setCurrPage(1);
          setFilterByStatus(e.target.value as Transaction["status"] | "all");
        }}
      >
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>

      <table>
        <thead>
          <tr>
            <th
              onClick={() => {
                setCurrPage(1);
                setDateSortOrder(dateSortOrder === "asc" ? "desc" : "asc");
              }}
            >
              Date {dateSortOrder === "asc" ? "↑" : "↓"}
            </th>
            <th>Amount</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item) => (
            <tr key={item.id}>
              <td>{item.date}</td>
              <td>{currencyFormatter(item.amount)}</td>
              <td>{item.description}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/*Pagination Buttons*/}
      <PaginationButtons
        pageAmount={amountOfPages}
        currPage={currPage}
        setCurrPage={setCurrPage}
      />
    </>
  );
}

export default App;

function SearchInput({ onSearch }: { onSearch: (value: string) => void }) {
  // This state is local to SearchInput, so typing only re-renders this
  // small component instead of the whole App tree.
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, onSearch]);

  return (
    <input
      type="text"
      placeholder="Search..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function PaginationButtons({
  pageAmount,
  currPage,
  setCurrPage,
}: {
  pageAmount: number;
  currPage: number;
  setCurrPage: (page: number) => void;
}) {
  return (
    <div>
      {Array.from({ length: pageAmount }, (_, index) => (
        <button
          key={index}
          onClick={() => setCurrPage(index + 1)}
          disabled={currPage === index + 1}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
