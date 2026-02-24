import { useEffect } from "react";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

export function useEditPageBreadcrumbs(
  baseTitle: string,
  baseHref: string,
  mode: "new" | "edit" | "copy",
  scoreId?: string
) {
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    const crumbs = [
      { title: `${baseTitle}一覧`, href: baseHref },
      ...(mode !== "new" ? [{ title: `${baseTitle}確認`, href: `${baseHref}/confirm?scoreId=${scoreId}` }] : []),
      { title: mode === "edit" ? `${baseTitle}編集` : `${baseTitle}新規作成`, href: "" }
    ];
    setBreadcrumbs(crumbs);
  }, [mode, scoreId, setBreadcrumbs, baseTitle, baseHref]);
}