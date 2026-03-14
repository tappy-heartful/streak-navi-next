"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { saveLive, LiveFormData } from "@/src/features/live/api/live-client-service";
import { rules } from "@/src/lib/validation";
import { Live, Score, SetlistGroup } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";
import { SetlistEdit } from "@/src/components/Setlist/SetlistEdit";

type Props = {
  mode: "new" | "edit" | "copy";
  liveId?: string;
  initialLive: Live | null;
  scores: Score[];
};

export function LiveEditClient({ mode, liveId, initialLive, scores }: Props) {
  const isNewOrCopy = mode === "new" || mode === "copy";

  const form = useAppForm<LiveFormData>(
    {
      title: (mode === "copy" ? `${initialLive?.title}（コピー）` : initialLive?.title) ?? "",
      date: (initialLive?.date ?? "").replace(/\./g, "-"),
      open: initialLive?.open ?? "",
      start: initialLive?.start ?? "",
      venue: initialLive?.venue ?? "",
      venueUrl: initialLive?.venueUrl ?? "",
      venueGoogleMap: initialLive?.venueGoogleMap ?? "",
      advance: initialLive?.advance != null ? String(initialLive.advance) : "",
      door: initialLive?.door != null ? String(initialLive.door) : "",
      flyerUrl: initialLive?.flyerUrl ?? "",
      isAcceptReserve: isNewOrCopy ? false : (initialLive?.isAcceptReserve ?? false),
      acceptStartDate: (initialLive?.acceptStartDate ?? "").replace(/\./g, "-"),
      acceptEndDate: (initialLive?.acceptEndDate ?? "").replace(/\./g, "-"),
      ticketStock: initialLive?.ticketStock != null ? String(initialLive.ticketStock) : "",
      maxCompanions: initialLive?.maxCompanions != null ? String(initialLive.maxCompanions) : "",
      notes: initialLive?.notes ?? "",
      setlist: initialLive?.setlist ?? [{ title: "", songIds: [] }],
    },
    {
      title: [rules.required],
      date: [rules.required],
      venue: [rules.required],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="ライブ" featureIdKey="liveId" basePath="/live"
        dataId={liveId} mode={mode}
        form={form}
        onSaveApi={(data) => saveLive(mode, data, liveId)}
      >
        <AppInput label="ライブ名" required {...inputProps("title")} />
        <AppInput label="開催日" required type="date" {...inputProps("date")} />
        <AppInput label="開場時間 (OPEN)" type="time" {...inputProps("open")} />
        <AppInput label="開演時間 (START)" type="time" {...inputProps("start")} />
        <AppInput label="会場名" required {...inputProps("venue")} />
        <AppInput label="会場公式サイトURL" type="url" {...inputProps("venueUrl")} />
        <AppInput label="Google Map URL" type="url" {...inputProps("venueGoogleMap")} />
        <AppInput label="前売料金（円）" {...inputProps("advance")} />
        <AppInput label="当日料金（円）" {...inputProps("door")} />
        <AppInput label="フライヤーURL（画像リンク）" type="url" {...inputProps("flyerUrl")} />

        {/* セットリスト */}
        <div className="form-group">
          <label className="label-title">セットリスト</label>
          <SetlistEdit
            setlist={form.formData.setlist}
            scores={scores}
            onChange={(val: SetlistGroup[]) => form.updateField("setlist", val)}
          />
        </div>

        <AppInput label="チケット予約受付を行う" type="checkbox" {...inputProps("isAcceptReserve")} />
        {form.formData.isAcceptReserve && (
          <>
            <AppInput label="受付開始日" type="date" {...inputProps("acceptStartDate")} />
            <AppInput label="受付終了日" type="date" {...inputProps("acceptEndDate")} />
            <AppInput label="販売総数（在庫）" type="number" {...inputProps("ticketStock")} />
            <AppInput label="最大同伴人数" type="number" {...inputProps("maxCompanions")} />
          </>
        )}
        <AppInput label="備考・ご案内" type="textarea" {...inputProps("notes")} />
      </EditFormLayout>
    </BaseLayout>
  );
}
