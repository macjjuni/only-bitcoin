import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd } from "@/shared/ui";
import { IncidentsScreen } from "@/views/incidents";
import {
  createIncidentsTimelineSchema,
  incidentsPageDescription,
  incidentsPageTitle,
} from "@/views/incidents/server";

export const metadata = createPageMetadata({
  path: "/incidents",
  title: incidentsPageTitle,
  description: incidentsPageDescription,
});

export default function IncidentsPage() {
  return (
    <>
      <JsonLd schema={createIncidentsTimelineSchema()} />
      <IncidentsScreen />
    </>
  );
}
