"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { Vote, Call, VoteItem, VoteChoice, CallAnswerSong } from "@/src/lib/firestore/types";
import { addVote, updateVote } from "@/src/features/vote/api/vote-client-service";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";

type Mode = "new" | "edit" | "copy" | "createFromCall";

type Props = {
  mode: Mode;
  voteId?: string;
  initialVote?: Vote | null;
  callData?: Call | null;
  callAnswers?: Array<Record<string, CallAnswerSong[]>>;
};

export function VoteEditClient({ mode, voteId, initialVote, callData, callAnswers }: Props) {
  const router = useRouter();
  const { userData, isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isEdit = mode === "edit";

  // items array management inside form
  const [items, setItems] = useState<VoteItem[]>([]);

  const [values, setValues] = useState({
    name: "",
    description: "",
    acceptStartDate: "",
    acceptEndDate: "",
    isAnonymous: false,
    hideVotes: false,
  });

  const handleChange = (k: string, v: string | boolean) => setValues(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/vote"));
      return;
    }
    setIsAuthorized(true);

    // Generate Breadcrumbs
    const paths = [{ title: "投票一覧", href: "/vote" }];
    if (isEdit || mode === "copy") {
      paths.push({ title: "投票確認", href: `/vote/confirm?voteId=${voteId}` });
      paths.push({ title: isEdit ? "投票編集" : "投票新規作成(コピー)", href: "" });
    } else if (mode === "createFromCall") {
      paths.push({ title: "曲募集から投票作成", href: "" });
    } else {
      paths.push({ title: "投票新規作成", href: "" });
    }
    setBreadcrumbs(paths);

    // Default dates
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date();
    end.setDate(end.getDate() + 13);
    const ymdStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const ymdEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    if ((mode === "edit" || mode === "copy") && initialVote) {
      setValues({
        name: initialVote.name + (mode === "copy" ? "（コピー）" : ""),
        description: initialVote.description || "",
        acceptStartDate: initialVote.acceptStartDate?.replace(/\./g, "-") || ymdStart,
        acceptEndDate: initialVote.acceptEndDate?.replace(/\./g, "-") || ymdEnd,
        isAnonymous: initialVote.isAnonymous || false,
        hideVotes: initialVote.hideVotes || false,
      });
      setItems(initialVote.items || []);
    } else if (mode === "createFromCall" && callData) {
      setValues({
        name: (callData.title || "") + " の投票",
        description: callData.description || "",
        acceptStartDate: ymdStart,
        acceptEndDate: ymdEnd,
        isAnonymous: false,
        hideVotes: false,
      });

      // Construct items from callData
      const newItems: VoteItem[] = [];
      const genres = callData.items || [];
      genres.forEach(genre => {
        const itemObj: VoteItem = { name: genre, choices: [] };
        // get songs for this genre, deduplicating by title
        const allSongs = (callAnswers || []).flatMap(ans => ans[genre] || []);
        const seen = new Set<string>();
        const songs = allSongs.filter(s => {
          if (!s.title || seen.has(s.title)) return false;
          seen.add(s.title);
          return true;
        });
        if (songs.length > 0) {
          itemObj.choices = songs.map(s => ({ name: s.title, link: s.url || "" }));
          if (songs.length === 1) itemObj.choices.push({ name: "" }); // Add empty placeholder if only 1 song
        } else {
          itemObj.choices = [{ name: "" }, { name: "" }]; // Empty choices
        }
        newItems.push(itemObj);
      });
      setItems(newItems);
    } else {
      setValues({
        name: "",
        description: "",
        acceptStartDate: ymdStart,
        acceptEndDate: ymdEnd,
        isAnonymous: false,
        hideVotes: false,
      });
      setItems([{ name: "", choices: [{ name: "" }, { name: "" }] }]);
    }
  }, [isAdmin, loading, mode, voteId, initialVote, callData, callAnswers, setBreadcrumbs, setValues, router]);

  // Handle Items Update
  const updateItem = (index: number, newName: string) => {
    const next = [...items];
    next[index].name = newName;
    setItems(next);
  };
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    setItems([...items, { name: "", choices: [{ name: "" }, { name: "" }] }]);
  };

  const updateChoice = (itemIdx: number, choiceIdx: number, newName: string) => {
    const next = [...items];
    next[itemIdx].choices[choiceIdx].name = newName;
    setItems(next);
  };
  const addChoice = (itemIdx: number) => {
    const next = [...items];
    next[itemIdx].choices.push({ name: "" });
    setItems(next);
  };
  const removeChoice = (itemIdx: number, choiceIdx: number) => {
    const next = [...items];
    next[itemIdx].choices = next[itemIdx].choices.filter((_, i) => i !== choiceIdx);
    setItems(next);
  };

  const handleSave = async () => {
    // Basic validation
    let valid = true;
    if (!values.name) {
      await showDialog("投票名を入力してください", true);
      valid = false;
    }
    if (!values.description) {
      await showDialog("投票説明を入力してください", true);
      valid = false;
    }
    if (!values.acceptStartDate || !values.acceptEndDate) {
      await showDialog("受付期間を入力してください", true);
      valid = false;
    }

    // date validation
    if (values.acceptStartDate && values.acceptEndDate) {
      const s = new Date(values.acceptStartDate + ' 00:00:00').getTime();
      const e = new Date(values.acceptEndDate + ' 23:59:59').getTime();
      if (s > e) {
        await showDialog("終了日は開始日以降にしてください", true);
        valid = false;
      }
      if (mode !== "edit") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        if (s < tomorrow.getTime()) {
          await showDialog("開始日は明日以降にしてください", true);
          valid = false;
        }
      }
    }

    // items validation
    if (items.length === 0) {
      await showDialog("投票項目を１つ以上追加してください", true);
      valid = false;
    }
    const itemNames = new Set<string>();
    for (const item of items) {
      if (!item.name) {
        await showDialog("全ての項目名を入力してください", true);
        valid = false; break;
      }
      if (itemNames.has(item.name)) {
        await showDialog("項目名が重複しています", true);
        valid = false; break;
      }
      itemNames.add(item.name);

      let hasChoice = false;
      const cNames = new Set<string>();
      for (const choice of item.choices) {
        if (choice.name) {
          hasChoice = true;
          if (cNames.has(choice.name)) {
            await showDialog("選択肢が重複しています", true);
            valid = false; break;
          }
          cNames.add(choice.name);
        }
      }
      if (!valid) break;

      if (!hasChoice) {
        await showDialog("各項目に選択肢を１つ以上入力してください", true);
        valid = false; break;
      }
    }

    if (!valid) return;

    if (!(await showDialog("保存しますか？"))) return;

    showSpinner();
    try {
      const dbItems = items.map(item => ({
        name: item.name,
        // merge existing links if mode is copy
        link: mode === "copy" ? initialVote?.items?.find(i => i.name === item.name)?.link || "" : item.link || "",
        choices: item.choices.filter(c => !!c.name).map(c => ({
          name: c.name,
          link: mode === "copy" ? initialVote?.items?.find(i => i.name === item.name)?.choices?.find(oc => oc.name === c.name)?.link || "" : c.link || ""
        }))
      }));

      const payload: Partial<Vote> = {
        name: values.name,
        description: values.description,
        descriptionLink: mode === "copy" && values.description === initialVote?.description ? initialVote?.descriptionLink || "" : "",
        acceptStartDate: values.acceptStartDate.replace(/-/g, "."),
        acceptEndDate: values.acceptEndDate.replace(/-/g, "."),
        isAnonymous: values.isAnonymous,
        hideVotes: values.hideVotes,
        items: dbItems,
      };

      let newVoteId = voteId;

      if (isEdit && voteId) {
        await updateVote(voteId, payload);
      } else {
        payload.createdBy = userData?.displayName || "";
        newVoteId = await addVote(payload as Omit<Vote, "id">);
      }

      hideSpinner();
      await showDialog("保存しました", true);

      if (await showDialog("続いて選択肢のリンクを設定しますか？")) {
        router.push(`/vote/link-edit?voteId=${newVoteId}`);
      } else {
        router.push(`/vote/confirm?voteId=${newVoteId}`);
      }
    } catch {
      hideSpinner();
      await showDialog("保存に失敗しました", true);
    }
  };

  if (loading || !isAuthorized) return <div style={{ padding: "2rem", textAlign: "center" }}>権限を確認中...</div>;

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>{isEdit ? "投票編集" : mode === "copy" ? "投票新規作成(コピー)" : mode === "createFromCall" ? "曲募集から投票作成" : "投票新規作成"}</h1>
      </div>
      <div className="container">
        <div className="form-group">
          <AppInput label="投票名" field="name" required value={values.name} updateField={handleChange} />
          <AppInput label="投票説明" field="description" required value={values.description} updateField={handleChange} />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "bold" }}>受付期間 <span className="required">*</span></label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="date" className="form-control" value={values.acceptStartDate} onChange={e => handleChange("acceptStartDate", e.target.value)} />
            <span>～</span>
            <input type="date" className="form-control" value={values.acceptEndDate} onChange={e => handleChange("acceptEndDate", e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: "bold", marginBottom: "8px", display: "block" }}>投票項目 <span className="required">*</span></label>
          <div>
            {items.map((item, i) => (
              <div key={i} className="vote-item">
                <input type="text" className="form-control" placeholder="項目名（例：演目候補）" value={item.name} onChange={e => updateItem(i, e.target.value)} />
                <div className="vote-choices" style={{ marginTop: "12px", marginLeft: "16px" }}>
                  {item.choices.map((choice, j) => (
                    <div key={j} className="choice-wrapper">
                      <span>・</span>
                      <input type="text" className="form-control" placeholder={`選択肢${j + 1}`} value={choice.name} onChange={e => updateChoice(i, j, e.target.value)} />
                      <button type="button" onClick={() => removeChoice(i, j)} className="remove-choice">×</button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "10px" }}>
                  <button type="button" onClick={() => addChoice(i)} className="add-choice">＋ 選択肢を追加</button>
                  <button type="button" onClick={() => removeItem(i)} className="remove-item">× 項目を削除</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="add-item-button">＋ 投票項目を追加</button>
          </div>
        </div>

        <div className="form-group">
          <AppInput type="checkbox" label="匿名投票（誰がどこに投票したかわからなくする）" field="isAnonymous" value={values.isAnonymous} updateField={handleChange} />
          <AppInput type="checkbox" label="票数を非公開（※管理者以外には、途中経過や終了結果の票数が見えなくなります）" field="hideVotes" value={values.hideVotes} updateField={handleChange} />
        </div>

        <FormButtons
          mode={mode === "createFromCall" ? "new" : mode}
          onSave={handleSave}
          onClear={() => { }} // or implement actual clear
        />
      </div>
      <FormFooter
        backHref={isEdit || mode === "copy" ? `/vote/confirm?voteId=${voteId}` : "/vote"}
        backText={isEdit || mode === "copy" ? "投票確認" : "投票一覧"}
      />
    </BaseLayout>
  );
}
