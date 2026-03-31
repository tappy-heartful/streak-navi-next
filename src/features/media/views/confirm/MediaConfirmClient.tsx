"use client";

import { buildYouTubeHtml, buildGoogleDriveHtml } from "@/src/lib/functions";
import { InstagramEmbed } from "@/src/components/InstagramEmbed";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Media } from "@/src/lib/firestore/types";

type Props = {
  mediaData: Media;
  mediaId: string;
};

export function MediaConfirmClient({ mediaData, mediaId }: Props) {
  return (
    <BaseLayout>
      <ConfirmLayout
        name="メディア"
        icon="fa fa-photo-film"
        basePath="/media"
        dataId={mediaId}
        featureIdKey="mediaId"
        collectionName="medias"
        afterDeletePath="/media"
      >
        <DisplayField label="日付">
          {mediaData.date}
        </DisplayField>

        <DisplayField label="タイトル">
          {mediaData.title}
        </DisplayField>

        <DisplayField label="Instagram">
          {mediaData.instagramUrl ? (
            <InstagramEmbed url={mediaData.instagramUrl} />
          ) : "未設定"}
        </DisplayField>

        <DisplayField label="YouTube">
          {mediaData.youtubeUrl ? (
            <div
              className="youtube-display-area"
              dangerouslySetInnerHTML={{ __html: buildYouTubeHtml(mediaData.youtubeUrl) }}
            />
          ) : "未設定"}
        </DisplayField>

        <DisplayField label="Google Drive">
          {mediaData.driveUrl ? (
            <div
              className="drive-display-area"
              dangerouslySetInnerHTML={{ __html: buildGoogleDriveHtml(mediaData.driveUrl) }}
            />
          ) : "未設定"}
        </DisplayField>

        <DisplayField label="ホームに表示">
          {mediaData.isDispTop ? "表示する" : "表示しない"}
        </DisplayField>
      </ConfirmLayout>
    </BaseLayout>
  );
}
