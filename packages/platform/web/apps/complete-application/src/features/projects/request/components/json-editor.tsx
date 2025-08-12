"use client"

import { JsonViewer } from "./json-tree-viewer"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useState, useEffect, useRef } from "react"

const sampleData = {
  string: "Hello, world!",
  number: 42,
  boolean: true,
  null: null,
  object: {
    nested: {
      value: "This is nested",
      array: [1, 2, 3],
    },
    empty: {},
  },
  array: ["string", 123, false, { key: "value" }, ["nested", "array"]],
  longText:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.",
  createdAt: new Date(),
}

interface JsonEditorProps {
  onJsonChange?: (data: any) => void;
  initialJsonData?: any;
}

export default function JsonEditor({ onJsonChange, initialJsonData }: JsonEditorProps) {
  const initializedRef = useRef(false);
  const [jsonInput, setJsonInput] = useState(() => {
    if (initialJsonData) {
      return JSON.stringify(initialJsonData, null, 2);
    }
    return "";
  });
  const [parsedData, setParsedData] = useState<any>(initialJsonData || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onJsonChange) {
      onJsonChange(parsedData);
    }
  }, [parsedData, onJsonChange]);

  // Update state when initialJsonData prop changes (only if not already initialized by user interactions)
  useEffect(() => {
    if (!initializedRef.current && initialJsonData !== undefined) {
      const jsonString = initialJsonData ? JSON.stringify(initialJsonData, null, 2) : "";
      setJsonInput(jsonString);
      setParsedData(initialJsonData);
      setError(null);
      initializedRef.current = true;
    }
  }, [initialJsonData]);

  const handleJsonInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJsonInput(value)
    initializedRef.current = true; // Mark as initialized by user interaction
    
    try {
      const parsed = JSON.parse(value)
      setParsedData(parsed)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON")
    }
  }

  return (
    <div className="container py-10 max-w-7xl">
      <div className="grid grid-cols-1 grid-rows-2 gap-4 h-[calc(100vh-22rem)]">
        <div className="border rounded-lg p-4 bg-card flex flex-col h-full">
          <Textarea
            value={jsonInput}
            onChange={handleJsonInputChange}
            className="font-mono flex-1 resize-none"
            placeholder={JSON.stringify(sampleData, null, 2)}
          />
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-card overflow-auto h-full">
          <JsonViewer data={parsedData ?? {}} rootName="data" />
        </div>
      </div>
    </div>
  )
}
