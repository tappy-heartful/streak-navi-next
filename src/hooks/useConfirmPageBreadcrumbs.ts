import { useEffect } from "react";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

export function useConfirmPageBreadcrumbs(baseTitle: string, baseHref: string) {
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([
      { title: `${baseTitle}一覧`, href: baseHref },
      { title: `${baseTitle}確認`, href: "" },
    ]);
  }, [setBreadcrumbs, baseTitle, baseHref]);
}