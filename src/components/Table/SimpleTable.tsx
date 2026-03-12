"use client";

import React from "react";

type Props = {
  headers: string[];
  emptyMessage?: string;
  hasData: boolean;
  children: React.ReactNode;
};

/**
 * SearchableListLayout等に依存しない、シンプルな list-table
 */
export const SimpleTable = ({ headers, emptyMessage = "データがありません", hasData, children }: Props) => {
  return (
    <table className="list-table">
      <thead>
        <tr>
          {headers.map((header, i) => <th key={i}>{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {hasData ? (
          children
        ) : (
          <tr>
            <td colSpan={headers.length} className="text-center">
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
