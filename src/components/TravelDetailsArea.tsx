"use client";

import React from "react";
import { TravelRouteMap } from "./TravelRouteMap";

type Props = {
  departurePrefName: string;
  departureMunName: string;
  arrivalPrefName: string;
  arrivalMunName: string;
  date: string;
  height?: string;
};

/**
 * Common Component to display Travel details (Departure, Arrival, and Route Map)
 */
export function TravelDetailsArea({
  departurePrefName,
  departureMunName,
  arrivalPrefName,
  arrivalMunName,
  date,
  height = "200px"
}: Props) {
  return (
    <div style={{ 
      border: "1px solid #e3f2fd", 
      padding: "16px", 
      borderRadius: "12px", 
      background: "#f1f8ff",
      boxShadow: "0 2px 6px rgba(25, 118, 210, 0.05)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#1976d2", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>出発</div>
          <div style={{ fontSize: "0.75rem", color: "#666", fontWeight: "normal", marginTop: "2px" }}>
            {departurePrefName}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#2c3e50" }}>
            {departureMunName}
          </div>
        </div>
        
        <div style={{ textAlign: "center", minWidth: "50px" }}>
          <div style={{ fontSize: "0.65rem", color: "#1976d2", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>往復</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "30px" }}>
             <i className="fas fa-exchange-alt" style={{ color: "#1976d2", fontSize: "1.1rem" }}></i>
          </div>
        </div>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "0.65rem", color: "#1976d2", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>到着</div>
          <div style={{ fontSize: "0.75rem", color: "#666", fontWeight: "normal", marginTop: "2px" }}>
            {arrivalPrefName}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#2c3e50" }}>
            {arrivalMunName}
          </div>
        </div>
      </div>
      
      <TravelRouteMap
        departurePrefecture={departurePrefName}
        departureMunicipality={departureMunName}
        arrivalPrefecture={arrivalPrefName}
        arrivalMunicipality={arrivalMunName}
        departureDate={date}
        height={height}
      />
    </div>
  );
}
