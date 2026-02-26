import { useState, useCallback } from "react";

// T に Record<string, any> の制約を付与
export function useAppForm<T extends Record<string, any>>(
  initialValues: T,
  validationSchema: { [K in keyof T]?: ((v: T[K]) => string | true)[] }
) {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<{ [K in keyof T]?: string }>({});

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const validate = useCallback(() => {
    const newErrors: any = {};
    for (const key in validationSchema) {
      const fieldRules = validationSchema[key];
      if (!fieldRules) continue;
      for (const rule of fieldRules) {
        const result = rule(formData[key]);
        if (result !== true) {
          newErrors[key] = result;
          break;
        }
      }
    }
    setErrors(newErrors);
    return newErrors;
  }, [formData, validationSchema]);

  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues]);

  return { formData, errors, updateField, validate, resetForm };
}

// Layoutで受け取るための型定義
export type AppFormReturn<T extends Record<string, any>> = {
  formData: T;
  errors: { [K in keyof T]?: string };
  updateField: (field: keyof T, value: any) => void;
  validate: () => { [K in keyof T]?: string };
  resetForm: () => void;
};