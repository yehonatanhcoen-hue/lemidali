import { Suspense } from "react";
import { LessonScreen } from "@/components/screens/lesson";
import { Skeleton } from "@/components/ui";

// Data is loaded client-side (single-user app); params are read with useParams.
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <LessonScreen />
    </Suspense>
  );
}
