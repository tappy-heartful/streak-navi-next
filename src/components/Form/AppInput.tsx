import { FormField } from "./FormField";

// src/components/Form/AppInput.tsx
type AppInputProps = {
  label: string;
  field: string;
  value: any;
  error?: string;
  required?: boolean;
  type?: "text" | "checkbox";
  updateField: (field: any, value: any) => void;
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

  return (
    <FormField label={label} required={required} error={error}>
      <input
        type={type}
        className="form-control"
        value={value}
        onChange={(e) => updateField(field, e.target.value)}
      />
    </FormField>
  );
};