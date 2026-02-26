import { useState, useCallback } from "react";

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

  // ★ 追加：リセット関数
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
  }, [initialValues]);

  return { formData, errors, updateField, validate, resetForm };
}