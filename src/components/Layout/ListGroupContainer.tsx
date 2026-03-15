"use client";

import React from "react";

type Props = {
  title: string;
  icon?: string;
  children: React.ReactNode;
  containerStyle?: React.CSSProperties;
  titleStyle?: React.CSSProperties;
};


/**
 * ListBaseLayout の中で、項目をグループ化するコンテナ（旧バニラの .section-group に相当）
 */
export const ListGroupContainer = ({ title, icon, children, containerStyle, titleStyle }: Props) => {
  return (
    <div className="section-group" style={{ marginBottom: "2.5rem", ...containerStyle }}>
      <h2 
        className="section-title" 
        style={{ 
          fontSize: "1.2rem", 
          color: "#333", 
          marginBottom: "15px", 
          paddingLeft: "10px", 
          borderLeft: "5px solid #4CAF50", 
          display: "flex", 
          alignItems: "center",
          gap: "10px",
          ...titleStyle 
        }}
      >
        {icon && <i className={icon}></i>}
        <span>{title}</span>
      </h2>
      <div className="table-wrapper">
        {children}
      </div>
    </div>
  );
};

