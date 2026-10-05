import {
  getExpenseApplyServer,
  getPrefecturesServer,
  getExpenseTypesServer,
  getExpenseCategoriesServer,
  getExpenseItemsServer,
  getTravelConfigServer,
  getPastEventsServer,
} from "@/src/features/expense-apply/api/expense-apply-server-actions";
import { ExpenseApplyEditClient } from "@/src/features/expense-apply/views/edit/ExpenseApplyEditClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    mode?: string;
    expenseId?: string;
    typeId?: string;
    categoryId?: string;
    itemId?: string;
    eventId?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode = "new", expenseId } = await searchParams;
  if (mode === "new" || !expenseId) {
    return { title: "経費申請作成" };
  }

  const expense = await getExpenseApplyServer(expenseId);
  return {
    title: expense?.name ? `${expense.name} - 経費申請編集` : "経費申請編集",
  };
}

export default async function ExpenseEditPage({ searchParams }: Props) {
  const { mode, expenseId, typeId, categoryId, itemId, eventId } = await searchParams;
  const isEdit = mode === "edit" || mode === "copy";

  const [
    initialData,
    prefectures,
    masterTypes,
    masterCategories,
    masterItems,
    travelConfig,
    pastEvents,
  ] = await Promise.all([
    isEdit && expenseId ? getExpenseApplyServer(expenseId) : Promise.resolve(null),
    getPrefecturesServer(),
    getExpenseTypesServer(),
    getExpenseCategoriesServer(),
    getExpenseItemsServer(),
    getTravelConfigServer(),
    getPastEventsServer(),
  ]);

  return (
    <ExpenseApplyEditClient
      mode={(mode as any) || "new"}
      expenseId={expenseId}
      initialData={initialData}
      prefectures={prefectures}
      initialMasterTypes={masterTypes}
      initialMasterCategories={masterCategories}
      initialMasterItems={masterItems}
      initialTravelConfig={travelConfig as any}
      pastEvents={pastEvents}
      queryParams={{ typeId, categoryId, itemId, eventId }}
    />
  );
}
