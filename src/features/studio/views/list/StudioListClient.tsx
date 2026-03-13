"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ListGroupContainer } from "@/src/components/Layout/ListGroupContainer";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { Studio, Prefecture } from "@/src/lib/firestore/types";

type Props = {
  initialData: {
    studios: Studio[];
    prefectures: Prefecture[];
  };
};

const TABLE_HEADERS = ["スタジオ名", "公式サイト", "地図", "空き情報", "利用料", "部屋一覧", "電話番号", "予約方法", "アクセス", "備考"];

function ExternalLinkCell({ href, icon, label }: { href?: string; icon: string; label: string }) {
  return (
    <td className="text-center">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="list-external-link">
          <i className={icon}></i> {label}
        </a>
      ) : "-"}
    </td>
  );
}

function TelCell({ tel }: { tel?: string }) {
  return (
    <td className="text-center">
      {tel ? (
        <a href={`tel:${tel}`} className="list-external-link">
          <i className="fas fa-phone-alt"></i> {tel}
        </a>
      ) : "-"}
    </td>
  );
}

export function StudioListClient({ initialData }: Props) {
  const { studios, prefectures } = initialData;

  const studiosByPref = useMemo(() => {
    const grouped: Record<string, Studio[]> = {};
    studios.forEach(studio => {
      const prefId = studio.prefecture || "";
      if (!grouped[prefId]) grouped[prefId] = [];
      grouped[prefId].push(studio);
    });
    return grouped;
  }, [studios]);

  return (
    <BaseLayout>
      <ListBaseLayout title="スタジオ" icon="fa fa-building" basePath="/studio">
        {prefectures.map(pref => {
          const prefStudios = studiosByPref[pref.id];
          if (!prefStudios || prefStudios.length === 0) return null;

          return (
            <div key={pref.id} className="container">
              <ListGroupContainer title={pref.name}>
                <SimpleTable headers={TABLE_HEADERS} hasData={prefStudios.length > 0}>
                  {prefStudios.map(studio => (
                    <tr key={studio.id}>
                      <td className="list-table-row-header">
                        <Link href={`/studio/confirm?studioId=${studio.id}`}>{studio.name}</Link>
                      </td>

                      <ExternalLinkCell href={studio.hp} icon="fas fa-external-link-alt" label="HP" />

                      <ExternalLinkCell href={studio.map} icon="fas fa-map-marker-alt" label="Map" />

                      <ExternalLinkCell href={studio.availabilityInfo} icon="fas fa-calendar-alt" label="空き" />

                      <ExternalLinkCell href={studio.fee} icon="fas fa-yen-sign" label="料金" />

                      <td>
                        {(studio.rooms || []).length > 0 ? (
                          (studio.rooms || []).map((roomName, i) => (
                            <a key={i} href={studio.roomsUrl || "#"} target="_blank" rel="noopener noreferrer" className="room-link">
                              {roomName}
                            </a>
                          ))
                        ) : "-"}
                      </td>

                      <TelCell tel={studio.tel} />

                      <ExternalLinkCell href={studio.reserve} icon="far fa-calendar-check" label="予約" />

                      <ExternalLinkCell href={studio.access} icon="fas fa-car" label="アクセス" />

                      <td style={{ whiteSpace: "pre-wrap" }}>{studio.note || "-"}</td>
                    </tr>
                  ))}
                </SimpleTable>
              </ListGroupContainer>
            </div>
          );
        })}
      </ListBaseLayout>
    </BaseLayout>
  );
}
