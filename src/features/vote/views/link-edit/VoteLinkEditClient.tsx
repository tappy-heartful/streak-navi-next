"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vote, VoteItem, VoteChoice } from "@/src/lib/firestore/types";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { AppInput } from "@/src/components/Form/AppInput";
import { updateVote } from "@/src/features/vote/api/vote-client-service";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  vote: Vote;
  voteId: string;
};

export function VoteLinkEditClient({ vote, voteId }: Props) {
  const router = useRouter();
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [descriptionLink, setDescriptionLink] = useState(vote.descriptionLink || "");
  const [items, setItems] = useState<VoteItem[]>(vote.items || []);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/vote"));
      return;
    }
    setIsAuthorized(true);

    setBreadcrumbs([
      { title: "投票一覧", href: "/vote" },
      { title: "投票確認", href: `/vote/confirm?voteId=${voteId}` },
      { title: "投票リンク設定", href: "" }
    ]);
  }, [setBreadcrumbs, voteId, isAdmin, loading, router]);

  const handleItemChange = (idx: number, val: string) => {
    const newItems = [...items];
    newItems[idx].link = val;
    setItems(newItems);
  };

  const handleChoiceChange = (itemIdx: number, choiceIdx: number, val: string) => {
    const newItems = [...items];
    newItems[itemIdx].choices[choiceIdx].link = val;
    setItems(newItems);
  };

  const validateUrls = () => {
    const urlPattern = /^(https?:\/\/|mailto:|tel:)/i;
    let isValid = true;

    if (descriptionLink && !urlPattern.test(descriptionLink)) isValid = false;

    items.forEach(item => {
      if (item.link && !urlPattern.test(item.link)) isValid = false;
      item.choices.forEach((choice: VoteChoice) => {
        if (choice.link && !urlPattern.test(choice.link)) isValid = false;
      });
    });

    return isValid;
  };

  const handleSave = async () => {
    if (!validateUrls()) {
      await showDialog("正しいリンク形式(http://, https://)で入力してください", true);
      return;
    }

    const confirmed = await showDialog("保存しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await updateVote(voteId, {
        descriptionLink,
        items
      });
      hideSpinner();
      await showDialog("保存しました", true);
      router.refresh();
      router.push(`/vote/confirm?voteId=${voteId}`);
    } catch {
      hideSpinner();
      await showDialog("保存に失敗しました", true);
    }
  };

  if (loading || !isAuthorized) return <div style={{ padding: "2rem", textAlign: "center" }}>権限を確認中...</div>;

  return (
    <BaseLayout>
      <div className="page-header">
        <h1><i className="fas fa-vote-yea" /> 投票リンク設定</h1>
      </div>
      <div className="container">
        <div style={{ marginBottom: "24px" }}>
          <h2>{vote.name} のリンク設定</h2>
          <AppInput
            field="desc-link"
            label="投票説明のリンク"
            value={descriptionLink}
            placeholder="https://..."
            updateField={(_, val) => setDescriptionLink(val)}
          />
        </div>

        <div>
          {items.map((item, i) => (
            <div key={item.name} className="vote-item" style={{ marginBottom: "24px", border: "1px solid #ddd", padding: "16px", borderRadius: "8px", backgroundColor: "#fafafa" }}>
              <div style={{ marginBottom: "16px" }}>
                <AppInput
                  field={`item-link-${i}`}
                  label={`項目名：${item.name}`}
                  value={item.link || ""}
                  placeholder="https://..."
                  updateField={(_, val) => handleItemChange(i, val)}
                />
              </div>

              <div style={{ marginLeft: "16px" }}>
                {item.choices.map((choice: VoteChoice, j: number) => (
                  <div key={choice.name} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ marginRight: "8px", width: "120px" }}>・{choice.name}</span>
                    <div style={{ flex: 1 }}>
                      <AppInput
                        field={`choice-link-${i}-${j}`}
                        label={`${choice.name} のリンク`}
                        value={choice.link || ""}
                        placeholder="https://..."
                        updateField={(_, val) => handleChoiceChange(i, j, val)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <FormButtons
          mode="edit"
          onSave={handleSave}
          onClear={() => { }}
        />
      </div>
      <FormFooter
        backHref={`/vote/confirm?voteId=${voteId}`}
        backText="投票確認"
      />
    </BaseLayout>
  );
}
