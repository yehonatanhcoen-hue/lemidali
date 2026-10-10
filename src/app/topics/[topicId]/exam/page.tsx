import { Suspense } from "react";
import { ExamScreen } from "@/components/screens/exam";
import { Skeleton } from "@/components/ui";

// Data is loaded client-side (single-user app); params are read with useParams.
export default function Page() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ExamScreen />
    </Suspense>
  );
}
