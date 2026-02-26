import { useState, useMemo, useCallback } from "react";

export function useSearchableList<T, F extends Record<string, any>>(
  data: T[],
  initialFilters: F,
  filterFn: (item: T, filters: F) => boolean,
  sortFn?: (a: T, b: T, filters: F) => number
) {
  const [filters, setFilters] = useState<F>(initialFilters);

  const updateFilter = useCallback((key: keyof F, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const filteredData = useMemo(() => {
    let result = data.filter((item) => filterFn(item, filters));
    if (sortFn) {
      result = [...result].sort((a, b) => sortFn(a, b, filters));
    }
    return result;
  }, [data, filters, filterFn, sortFn]);

  return { filters, setFilters, updateFilter, resetFilters, filteredData };
}