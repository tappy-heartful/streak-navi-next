import { fetchMasterDataServer } from "@/src/features/master/api/master-server-actions";
import { MasterMaintenanceClient } from "@/src/features/master/views/MasterMaintenanceClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "マスタ管理 - Streak Navi",
};

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const data = await fetchMasterDataServer();

  return (
    <MasterMaintenanceClient
      initialInstruments={data.instruments}
      initialSections={data.sections}
      initialRoles={data.roles}
      initialGenres={data.genres}
      initialDefaultInstrumentConfig={data.defaultInstrumentConfig}
    />
  );
}

