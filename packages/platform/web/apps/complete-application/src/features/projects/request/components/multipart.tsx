"use client";

import { KeyValuePair } from "./key-value-pair";

export default function Multipart() {
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
      }}
    />
  );
} 