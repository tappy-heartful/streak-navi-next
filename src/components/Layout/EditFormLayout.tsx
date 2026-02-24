"use client";

import React from "react";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";

type Props = {
  title: string;
  mode: "new" | "edit" | "copy";
  onSave: () => void;
  backHref: string;
  backText: string;
  children: React.ReactNode;
};

/**
 * 編集・新規作成画面専用の枠組みレイアウト
 */
export const EditFormLayout = ({ 
  title, 
  mode, 
  onSave, 
  backHref, 
  backText, 
  children 
}: Props) => {
  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      
      <div className="container">
        {children}
        <FormButtons mode={mode} onSave={onSave} />
      </div>

      <FormFooter backHref={backHref} backText={backText} />
    </>
  );
};