import React from "react";

type Props = {
  children: React.ReactNode;
};

/**
 * すべてのページで共通の基本レイアウト
 */
export const BaseLayout = ({ children }: Props) => {
  return <main>{children}</main>;
};