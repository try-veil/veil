import React from 'react';
import { Editor } from '@monaco-editor/react';

interface GraphQLEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export const GraphQLEditor: React.FC<GraphQLEditorProps> = ({
  value,
  onChange,
  placeholder = "",
  className = ""
}) => {
  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <Editor
        height="200px"
        defaultLanguage="graphql"
        defaultValue="query {}"
        value={value}
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto'
          },
          automaticLayout: true,
          wordWrap: 'on',
          theme: 'vs-light',
        }}
      />
    </div>
  );
};
