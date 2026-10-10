import { Suspense } from "react";
import { LessonScreen } from "@/components/screens/lesson";
import { Skeleton } from "@/components/ui";

// Static page; the id comes from the query string (?id=…) and data loads client-side.
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <LessonScreen />
    </Suspense>
  );
}
