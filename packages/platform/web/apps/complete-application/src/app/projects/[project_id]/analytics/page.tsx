import { Button } from "@/components/ui/button";
import { IconDeviceDesktopAnalytics } from "@tabler/icons-react";
import Link from "next/link";
export default function page() {
  return (
      <div className="mt-20 mx-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <IconDeviceDesktopAnalytics size={172} />
        <h1 className="text-4xl font-bold leading-tight">
          Monitor Analytics with Grafana Dashboard
        </h1>
        <p className="text-center text-muted-foreground">
          Gain insights into API performance, including request volumes, average
          response times, <br /> endpoint usage, error logs, and more. 
        </p>
        <Button>
          <Link href={process.env.GRAFANA_URL || ""} target="_blank">
            Open Grafana Dashboard
          </Link>
        </Button>
      </div>
  );
}
