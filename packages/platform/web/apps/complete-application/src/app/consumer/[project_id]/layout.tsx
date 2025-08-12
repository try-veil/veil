'use client'
import { useProject } from "@/context/project-context";
import { useEffect } from "react";

export default function ConsumerProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { project_id: string };
}) {
  const { setSelectedProjectId } = useProject();

  // Set the project ID from URL params for consumer routes
  useEffect(() => {
    setSelectedProjectId(params.project_id);
  }, [params.project_id, setSelectedProjectId]);

  return <>{children}</>;
}
