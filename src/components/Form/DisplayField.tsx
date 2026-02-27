"use client";

import React from "react";

type Props = {
  label: string;
  children: React.ReactNode;
  preWrap?: boolean; // 備考など改行を活かす場合
};

export const DisplayField = ({ label, children, preWrap = false }: Props) => {
  return (
    <div className="form-group">
      <label className="label-title">{label}</label>
      <div 
        className="label-value" 
        style={preWrap ? { whiteSpace: "pre-wrap" } : undefined}
      >
        {children || "未設定"}
      </div>
    </div>
  );
};