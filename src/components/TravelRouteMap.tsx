"use client";

import React from "react";

type Props = {
  departurePrefecture?: string;
  departureMunicipality?: string;
  arrivalPrefecture?: string;
  arrivalMunicipality?: string;
  departureDate?: string; // YYYY.MM.DD or YYYY-MM-DD
  height?: string;
  style?: React.CSSProperties;
};

/**
 * Helper to generate stabilized Google Maps Route URL
 */
export const getGoogleMapsUrl = (
  departurePrefecture = "",
  departureMunicipality = "",
  arrivalPrefecture = "",
  arrivalMunicipality = "",
  departureDate?: string
) => {
  const saddr = encodeURIComponent(`${departurePrefecture}${departureMunicipality}`);
  const daddr = encodeURIComponent(`${arrivalPrefecture}${arrivalMunicipality}`);
  
  let datePart = "";
  if (departureDate) {
    const d = departureDate.replace(/\./g, "/");
    datePart = `&date=${encodeURIComponent(d)}&time=09:00&tt=0`;
  } else {
    datePart = `&time=09:00&tt=0`;
  }

  return `https://maps.google.com/maps?saddr=${saddr}&daddr=${daddr}&dirflg=r${datePart}&output=embed`;
};

/**
 * Google Maps Route Preview Component
 * Sets departure time to 9:00 AM of the specified date (if provided) for route stability.
 */
export function TravelRouteMap({
  departurePrefecture = "",
  departureMunicipality = "",
  arrivalPrefecture = "",
  arrivalMunicipality = "",
  departureDate,
  height = "200px",
  style = {}
}: Props) {
  const src = getGoogleMapsUrl(
    departurePrefecture,
    departureMunicipality,
    arrivalPrefecture,
    arrivalMunicipality,
    departureDate
  );

  return (
    <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e0e0e0", height, ...style }}>
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        src={src}
        title="Route Map"
      ></iframe>
    </div>
  );
}
