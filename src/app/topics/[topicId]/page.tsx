import { Suspense } from "react";
import { TopicScreen } from "@/components/screens/topic";
import { Skeleton } from "@/components/ui";

// Data is loaded client-side (single-user app); params are read with useParams.
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <TopicScreen />
    </Suspense>
  );
}
