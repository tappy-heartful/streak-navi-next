import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import Link from "next/link";

export default function ExpenseApplyPage() {
  return (
    <BaseLayout>
      <div className="page-header">
        <h1>経費申請</h1>
      </div>
      <div className="container">
        <p style={{ textAlign: "center", padding: "20px" }}>
          経費申請機能は現在準備中です。🍀
        </p>
      </div>
      <div className="page-footer" style={{ textAlign: "center", marginTop: "20px" }}>
        <Link href="/home" className="back-link">← ホームに戻る</Link>
      </div>
    </BaseLayout>
  );
}
