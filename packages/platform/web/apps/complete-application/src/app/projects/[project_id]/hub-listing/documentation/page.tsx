"use client";
import React, { useState, useCallback, useEffect} from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useProject } from "@/context/project-context";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { updateProject } from "@/lib/api";

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
    const { selectedProject, refreshProject } = useProject();
    const { accessToken } = useAuth();
  const [markdownContent, setMarkdownContent] = useState(
    "# API Documentation\n\nWrite your API documentation here..."
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize content when selectedProject is available
  useEffect(() => {
    console.log("selectedProject changed:", selectedProject);
    if ((selectedProject as any)?.hubListing?.apiDocumentation) {
      console.log("Setting markdown content from project:", (selectedProject as any).hubListing.apiDocumentation);
      setMarkdownContent((selectedProject as any).hubListing.apiDocumentation);
    } else {
      console.log("No apiDocumentation found in project, using default");
    }
  }, [selectedProject]);

  const handleContentChange = useCallback((val: string | undefined) => {
    const newContent = val || "";
    setMarkdownContent(newContent);
    setIsDirty(true);
  }, []);

  const handleDiscard = useCallback(() => {
    const initialContent = (selectedProject as any)?.hubListing?.apiDocumentation || "# API Documentation\n\nWrite your API documentation here...";
    setMarkdownContent(initialContent);
    setIsDirty(false);
  }, [selectedProject]);

  const handleSave = useCallback(async () => {
    console.log("Save function called");
    console.log("selectedProject:", selectedProject);
    console.log("accessToken:", !!accessToken);
    console.log("markdownContent:", markdownContent);
    
    if (!selectedProject || !accessToken) {
      console.log("Early return: missing selectedProject or accessToken");
      toast({
        title: "Error",
        description: "Missing project or authentication data",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!selectedProject?.id) {
        throw new Error("Project ID not found");
      }

      toast({
        title: "Updating Project...",
        description: "Please wait while we process your request",
        variant: "default",
      });

      const updateData = {
        ...selectedProject,
        apiDocumentation: markdownContent,
      };

      console.log("About to call updateProject with:", {
        accessToken: !!accessToken,
        projectId: selectedProject.id,
        data: updateData
      });

      const updatedProject = await updateProject(accessToken, selectedProject.id, updateData as any);
      
      console.log("API Response:", updatedProject);
      
      setIsDirty(false);

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      // Force refresh the project context after a longer delay
      setTimeout(async () => {
        console.log("Refreshing project...");
        await refreshProject();
        console.log("Project refreshed, selectedProject:", selectedProject);
      }, 1000);
    } catch (error) {
      console.error("Failed to save:", error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, accessToken, markdownContent, refreshProject]);

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
            onChange={handleContentChange}
            preview="live"
            height="100%"
            visibleDragbar={false}
            hideToolbar={false}
          />
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" type="button" onClick={handleDiscard} disabled={isLoading}>
            Discard Changes
          </Button>
          <Button 
            type="button" 
            onClick={() => {
              console.log("Save button clicked!");
              handleSave();
            }}
            disabled={isLoading || !isDirty}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}