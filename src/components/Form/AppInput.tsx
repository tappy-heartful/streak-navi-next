import { FormField } from "./FormField";

// src/components/Form/AppInput.tsx
type AppInputProps = {
  label: string;
  field: string;
  value: unknown;
  error?: string;
  required?: boolean;
  type?: "text" | "checkbox" | "date" | "time" | "url" | "number" | "textarea";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateField: (field: string, value: any) => void;
};

export const AppInput = ({ label, field, value, error, required, type = "text", updateField }: AppInputProps) => {
  if (type === "checkbox") {
    return (
      <div className="form-group checkbox-group">
        <label>
          <input type="checkbox" checked={!!value} onChange={(e) => updateField(field, e.target.checked)} />
          {label}
        </label>
      </div>
    );
  }

  const strValue = typeof value === "string" ? value : "";

  if (type === "textarea") {
    return (
      <FormField label={label} required={required} error={error}>
        <textarea
          className="form-control"
          value={strValue}
          rows={4}
          onChange={(e) => updateField(field, e.target.value)}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} required={required} error={error}>
      <input
        type={type}
        className="form-control"
        value={strValue}
        onChange={(e) => updateField(field, e.target.value)}
      />
    </FormField>
  );
};