"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { saveMedia } from "@/src/features/media/api/media-client-service";
import { rules } from "@/src/lib/validation";
import { Media } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";

type Props = {
  mode: "new" | "edit" | "copy";
  mediaId?: string;
  initialMedia: Media | null;
};

export function MediaEditClient({ mode, mediaId, initialMedia }: Props) {
  const form = useAppForm(
    {
      date: (initialMedia?.date ?? "").replace(/\./g, "-"),
      title: (mode === "copy" ? `${initialMedia?.title}（コピー）` : initialMedia?.title) ?? "",
      instagramUrl: initialMedia?.instagramUrl ?? "",
      youtubeUrl: initialMedia?.youtubeUrl ?? "",
      driveUrl: initialMedia?.driveUrl ?? "",
      isDispTop: mode === "new" ? false : (initialMedia?.isDispTop ?? false),
    },
    {
      date: [rules.required],
      title: [rules.required],
      instagramUrl: [rules.instagramOptional],
      youtubeUrl: [rules.youtubeOptional],
      driveUrl: [rules.googleDriveOptional],
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
        featureName="メディア" icon="fa fa-photo-film" featureIdKey="mediaId" basePath="/media"
        dataId={mediaId} mode={mode}
        form={form}
        onSaveApi={(data) => saveMedia(mode, data, mediaId)}
      >
        <AppInput label="日付" required type="date" {...inputProps("date")} />
        <AppInput label="タイトル" required {...inputProps("title")} />
        <AppInput label="Instagram URL" {...inputProps("instagramUrl")} />
        <AppInput label="YouTube URL" {...inputProps("youtubeUrl")} />
        <AppInput label="Google Drive URL" {...inputProps("driveUrl")} />
        <AppInput label="ホームに表示" type="checkbox" {...inputProps("isDispTop")} />
      </EditFormLayout>
    </BaseLayout>
  );
}
