import Cookies from "js-cookie";
import { ProjectProvider } from "@/context/project-context";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <ProjectProvider >
      {children}
    </ProjectProvider>
  );
}
