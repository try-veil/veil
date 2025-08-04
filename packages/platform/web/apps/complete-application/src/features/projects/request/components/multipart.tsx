"use client";

import { KeyValuePair } from "./key-value-pair";

interface MultipartProps {
  onFormDataChange?: (data: { key: string; value: string }[]) => void;
}

export default function Multipart({ onFormDataChange }: MultipartProps) {
  return (
    <KeyValuePair
      title="Multipart Form Data"
      keyLabel="Name"
      valueLabel="Value"
      keyPlaceholder="name"
      valuePlaceholder="value"
      addButtonText="Add Form Field"
      onChange={(pairs) => {
        // Handle multipart form data changes
        console.log("Multipart form data:", pairs);
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