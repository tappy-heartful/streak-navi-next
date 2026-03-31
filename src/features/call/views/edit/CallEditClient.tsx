"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { saveCall } from "@/src/features/call/api/call-client-service";
import { rules } from "@/src/lib/validation";
import { Call } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  mode: "new" | "edit" | "copy";
  callId?: string;
  initialCall: Call | null;
};

function getDefaultStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getDefaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 13);
  return d.toISOString().split("T")[0];
}

export function CallEditClient({ mode, callId, initialCall }: Props) {
  const { userData } = useAuth();

  const isNewOrCopy = mode === "new" || mode === "copy";

  const form = useAppForm(
    {
      title: (mode === "copy" ? `${initialCall?.title}（コピー）` : initialCall?.title) ?? "",
      description: initialCall?.description ?? "",
      acceptStartDate: isNewOrCopy
        ? getDefaultStartDate()
        : (initialCall?.acceptStartDate ?? "").replace(/\./g, "-"),
      acceptEndDate: isNewOrCopy
        ? getDefaultEndDate()
        : (initialCall?.acceptEndDate ?? "").replace(/\./g, "-"),
      items: initialCall?.items ?? [""],
      isAnonymous: initialCall?.isAnonymous ?? false,
    },
    {
      title: [rules.required],
      description: [rules.required],
      acceptStartDate: [rules.required],
      acceptEndDate: [rules.required],
      items: [
        (v: string[]) => v.filter(i => i.trim()).length > 0 || "募集ジャンルを1つ以上入力してください",
        (v: string[]) => {
          const valid = v.filter(i => i.trim());
          return new Set(valid).size === valid.length || "募集ジャンルが重複しています";
        },
      ],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  const addItem = () => form.updateField("items", [...form.formData.items, ""]);

  const removeItem = (index: number) => {
    const updated = form.formData.items.filter((_, i) => i !== index);
    form.updateField("items", updated.length > 0 ? updated : [""]);
  };

  const updateItem = (index: number, value: string) => {
    form.updateField("items", form.formData.items.map((v, i) => (i === index ? value : v)));
  };

  const handleSave = async (data: typeof form.formData): Promise<string> => {
    // 日付の妥当性チェック（cross-field validation）
    const start = new Date(data.acceptStartDate + "T00:00:00");
    const end = new Date(data.acceptEndDate + "T23:59:59");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNewOrCopy && start <= today) {
      throw new Error("validation:開始日は明日以降の日付を指定してください");
    }
    if (start > end) {
      throw new Error("validation:終了日は開始日以降にしてください");
    }

    return saveCall(mode, data, callId, userData?.displayName || undefined);
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="曲募集" icon="fa fa-music" featureIdKey="callId" basePath="/call"
        dataId={callId} mode={mode}
        form={form}
        onSaveApi={handleSave}
      >
        <AppInput label="タイトル" required placeholder="タイトルを入力してください" {...inputProps("title")} />
        <AppInput label="説明" required placeholder="曲募集の説明を入力してください" {...inputProps("description")} />
        <AppInput label="受付開始日" required type="date" {...inputProps("acceptStartDate")} />
        <AppInput label="受付終了日" required type="date" {...inputProps("acceptEndDate")} />

        <FormField label="募集ジャンル" required error={form.errors.items as string}>
          <div id="call-items-container">
            {form.formData.items.map((item, i) => (
              <div key={i} className="room-item">
                <input
                  type="text"
                  className="form-control"
                  value={item}
                  placeholder="募集ジャンルを入力..."
                  onChange={(e) => updateItem(i, e.target.value)}
                />
                <button type="button" className="remove-room-button" onClick={() => removeItem(i)}>
                  削除
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="add-room-button" onClick={addItem}>
            ＋ 項目を追加
          </button>
        </FormField>

        <AppInput label="匿名回答" type="checkbox" {...inputProps("isAnonymous")} />
      </EditFormLayout>
    </BaseLayout>
  );
}
