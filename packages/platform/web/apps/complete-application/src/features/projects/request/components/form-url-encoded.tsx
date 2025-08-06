"use client";

import { KeyValuePair } from "./key-value-pair";

interface FormUrlEncodedProps {
  onFormDataChange?: (data: { key: string; value: string }[]) => void;
}

export default function FormUrlEncoded({ onFormDataChange }: FormUrlEncodedProps) {
  return (
    <KeyValuePair
      title="Form URL Encoded"
      keyLabel="Name"
      valueLabel="Value"
      keyPlaceholder="name"
      valuePlaceholder="value"
      addButtonText="Add Form Field"
      onChange={(pairs) => {
        // Handle form-url-encoded data changes
        console.log("Form URL Encoded data:", pairs);
        if (onFormDataChange) {
          const formData = pairs
            .filter(pair => pair.key.trim() !== "" && pair.value.trim() !== "")
            .map(pair => ({ key: pair.key, value: pair.value }));
          onFormDataChange(formData);
        }
      }}
    />
  );
} 