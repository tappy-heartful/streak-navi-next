"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Studio, Prefecture } from "@/src/lib/firestore/types";

type Props = {
  studioData: Studio;
  studioId: string;
  prefectures: Prefecture[];
};

function LinkValue({ href, isTel = false }: { href?: string; isTel?: boolean }) {
  if (!href) return <>未設定</>;
  if (isTel) {
    return <a href={`tel:${href}`}>{href}</a>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {href}
    </a>
  );
}

export function StudioConfirmClient({ studioData, studioId, prefectures }: Props) {
  const prefName = prefectures.find(p => p.id === studioData.prefecture)?.name ?? "不明";

  return (
    <BaseLayout>
      <ConfirmLayout
        name="スタジオ"
        icon="fa fa-building"
        basePath="/studio"
        dataId={studioId}
        featureIdKey="studioId"
        collectionName="studios"
        afterDeletePath="/studio"
      >
        <DisplayField label="都道府県">
          {prefName}
        </DisplayField>

        <DisplayField label="スタジオ名">
          {studioData.name}
        </DisplayField>

        <DisplayField label="公式サイト">
          <LinkValue href={studioData.hp} />
        </DisplayField>

        <DisplayField label="地図">
          <LinkValue href={studioData.map} />
        </DisplayField>

        <DisplayField label="空き情報">
          <LinkValue href={studioData.availabilityInfo} />
        </DisplayField>

        <DisplayField label="利用料">
          <LinkValue href={studioData.fee} />
        </DisplayField>

        <DisplayField label="部屋一覧URL">
          <LinkValue href={studioData.roomsUrl} />
        </DisplayField>

        <DisplayField label="部屋一覧">
          {studioData.rooms && studioData.rooms.length > 0
            ? studioData.rooms.join("、 ")
            : "未設定"}
        </DisplayField>

        <DisplayField label="電話番号">
          <LinkValue href={studioData.tel} isTel />
        </DisplayField>

        <DisplayField label="予約方法">
          <LinkValue href={studioData.reserve} />
        </DisplayField>

        <DisplayField label="アクセス">
          <LinkValue href={studioData.access} />
        </DisplayField>

        <DisplayField label="備考" preWrap>
          {studioData.note}
        </DisplayField>
      </ConfirmLayout>
    </BaseLayout>
  );
}
