import Link from "next/link";

type Props = {
  backHref: string;
  backText: string;
};

export const FormFooter = ({ backHref, backText }: Props) => {
  return (
    <div className="page-footer">
      <Link href={backHref} className="back-link">
        ← {backText}に戻る
      </Link>
    </div>
  );
};