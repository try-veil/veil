"use client";

import { KeyValuePair } from "./key-value-pair";

export default function FormUrlEncoded() {
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
      }}
    />
  );
} 