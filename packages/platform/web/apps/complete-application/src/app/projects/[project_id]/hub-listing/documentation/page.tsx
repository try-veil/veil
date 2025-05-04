"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const MDEditor = dynamic(
  () =>
    import("@uiw/react-md-editor").then((mod) => {
      // Override the default styles with our custom classes
      const Editor = (props: any) => (
        <mod.default
          {...props}
          className={cn(
            "w-full rounded-md border bg-white text-foreground",
            "data-[mode=preview]:prose data-[mode=preview]:max-w-none data-[mode=preview]:dark:prose-invert",
            "[&_.w-md-editor-toolbar]:bg-background [&_.w-md-editor-toolbar]:border-b [&_.w-md-editor-toolbar]:border-border",
            "[&_.w-md-editor-content]:bg-background",
            "[&_.w-md-editor-toolbar_button]:text-muted-foreground [&_.w-md-editor-toolbar_button:hover]:bg-accent [&_.w-md-editor-toolbar_button:hover]:text-accent-foreground",
            "[&_.w-md-editor-text]:bg-background [&_.w-md-editor-text]:text-foreground",
            "[&_.w-md-editor-preview]:bg-background [&_.w-md-editor-preview]:text-foreground",
            "[&_.w-md-editor-preview]:border-l [&_.w-md-editor-preview]:border-border",
            "[&_pre]:bg-secondary [&_pre]:text-secondary-foreground [&_pre]:border [&_pre]:border-border",
            "[&_.wmde-markdown]:bg-background",
            "[&_code]:bg-secondary [&_code]:text-secondary-foreground [&_code]:px-1 [&_code]:py-0.5",
            props.className
          )}
        />
      );
      return Editor;
    }),
  { ssr: false }
);

export default function Documentation() {
  const [markdownContent, setMarkdownContent] = useState(
    "# API Documentation\n\n&quot;Write your API documentation here...&quot;"
  );

  const handleDiscard = () => {
    setMarkdownContent(initialContent);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving markdown content:", markdownContent);
  };

  const [initialContent] = useState(markdownContent);
  return (
    <div>
       <div className="flex-none">
        <h3 className="text-lg font-medium">API Documentation</h3>
        <p className="text-sm text-muted-foreground">
          Write your API documentation here...
        </p>
      </div>
      <Separator className="my-4 flex-none" />
      <div className="w-full h-full flex flex-col space-y-4">
        <div className="flex-1">
          <MDEditor
            value={markdownContent}
            onChange={(val: string) => setMarkdownContent(val || "")}
            preview="live"
            height="100%"
            visibleDragbar={false}
            hideToolbar={false}
          />
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" type="button" onClick={handleDiscard}>
            Discard Changes
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
