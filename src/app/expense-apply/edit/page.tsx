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

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ mode?: string; expenseId?: string }>;
};

export default async function ExpenseEditPage({ searchParams }: Props) {
  const { mode, expenseId } = await searchParams;
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
    />
  );
}
