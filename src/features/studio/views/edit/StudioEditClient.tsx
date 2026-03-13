"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { saveStudio } from "@/src/features/studio/api/studio-client-service";
import { rules } from "@/src/lib/validation";
import { Studio, Prefecture } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";

type Props = {
  mode: "new" | "edit" | "copy";
  studioId?: string;
  initialStudio: Studio | null;
  prefectures: Prefecture[];
};

export function StudioEditClient({ mode, studioId, initialStudio, prefectures }: Props) {
  const form = useAppForm(
    {
      prefecture: initialStudio?.prefecture ?? "",
      name: (mode === "copy" ? `${initialStudio?.name}（コピー）` : initialStudio?.name) ?? "",
      hp: initialStudio?.hp ?? "",
      map: initialStudio?.map ?? "",
      availabilityInfo: initialStudio?.availabilityInfo ?? "",
      fee: initialStudio?.fee ?? "",
      rooms: initialStudio?.rooms ?? [""],
      roomsUrl: initialStudio?.roomsUrl ?? "",
      tel: initialStudio?.tel ?? "",
      reserve: initialStudio?.reserve ?? "",
      access: initialStudio?.access ?? "",
      note: initialStudio?.note ?? "",
    },
    {
      prefecture: [rules.required],
      name: [rules.required],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  const addRoom = () => {
    form.updateField("rooms", [...form.formData.rooms, ""]);
  };

  const removeRoom = (index: number) => {
    const updated = form.formData.rooms.filter((_, i) => i !== index);
    form.updateField("rooms", updated.length > 0 ? updated : [""]);
  };

  const updateRoom = (index: number, value: string) => {
    const updated = form.formData.rooms.map((r, i) => (i === index ? value : r));
    form.updateField("rooms", updated);
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="スタジオ" featureIdKey="studioId" basePath="/studio"
        dataId={studioId} mode={mode}
        form={form}
        onSaveApi={(data) => saveStudio(mode, data, studioId)}
      >
        <FormField label="都道府県" required error={form.errors.prefecture}>
          <select
            className="form-control"
            value={form.formData.prefecture}
            onChange={(e) => form.updateField("prefecture", e.target.value)}
          >
            <option value="">選択してください</option>
            {prefectures.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FormField>

        <AppInput label="スタジオ名" required {...inputProps("name")} />
        <AppInput label="公式サイト URL" {...inputProps("hp")} />
        <AppInput label="地図 URL" {...inputProps("map")} />
        <AppInput label="空き情報 URL" {...inputProps("availabilityInfo")} />
        <AppInput label="利用料 URL" {...inputProps("fee")} />
        <FormField label="部屋一覧">
          <div id="rooms-container">
            {form.formData.rooms.map((room, i) => (
              <div key={i} className="room-item">
                <input
                  type="text"
                  className="form-control"
                  value={room}
                  placeholder="部屋名（例：Lスタジオ）"
                  onChange={(e) => updateRoom(i, e.target.value)}
                />
                <button
                  type="button"
                  className="remove-room-button"
                  onClick={() => removeRoom(i)}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="add-room-button" onClick={addRoom}>
            <i className="fas fa-plus"></i> 部屋を追加
          </button>
        </FormField>

        <AppInput label="部屋一覧 URL" {...inputProps("roomsUrl")} />
        <AppInput label="電話番号" {...inputProps("tel")} />
        <AppInput label="予約方法 URL" {...inputProps("reserve")} />
        <AppInput label="アクセス URL" {...inputProps("access")} />
        <AppInput label="備考" {...inputProps("note")} />

      </EditFormLayout>
    </BaseLayout>
  );
}
