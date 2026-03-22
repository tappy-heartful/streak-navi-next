import { TravelSubsidyClient } from "@/src/features/travel-subsidy/views/TravelSubsidyClient";
import {
  getPrefecturesForTravelSubsidy,
  getTravelSubsidiesServer,
  getMunicipalityNamesMapForSubsidies,
} from "@/src/features/travel-subsidy/api/travel-subsidy-server-actions";

export const metadata = {
  title: "旅費補助額設定",
};

export const dynamic = "force-dynamic";

export default async function TravelSubsidyPage() {
  const [prefectures, subsidies] = await Promise.all([
    getPrefecturesForTravelSubsidy(),
    getTravelSubsidiesServer(),
  ]);

  const municipalityNamesMap = await getMunicipalityNamesMapForSubsidies(subsidies);

  return (
    <TravelSubsidyClient
      initialSubsidies={subsidies}
      prefectures={prefectures}
      initialMunicipalityNamesMap={municipalityNamesMap}
    />
  );
}
