import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サイト情報",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
