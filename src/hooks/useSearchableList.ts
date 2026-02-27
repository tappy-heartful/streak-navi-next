import { useState, useMemo, useCallback } from "react";

export function useSearchableList<T extends Record<string, any>, F extends Record<string, any>>(
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

  // フィルタリング結果
  const filteredData = useMemo(() => {
    let result = data.filter((item) => filterFn(item, filters));
    if (sortFn) {
      result = [...result].sort((a, b) => sortFn(a, b, filters));
    }
    return result;
  }, [data, filters, filterFn, sortFn]);

  return { filters, updateFilter, resetFilters, filteredData };
}

// レイアウト側で受け取るための型
// T と F にも本体と同じ制約を付け加えます
export type SearchableListReturn<
  T extends Record<string, any>, 
  F extends Record<string, any>
> = ReturnType<typeof useSearchableList<T, F>>;