import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function AgreementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
