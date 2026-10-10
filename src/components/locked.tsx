"use client";

import Link from "next/link";
import { itemHref, itemTitle, quizStats, type Gate } from "@/lib/progress";
import type { CourseData } from "@/lib/types";
import { IconLock } from "./icons";
import { Card } from "./ui";

export function LockedCard({ data, gate }: { data: CourseData; gate: Gate }) {
  const blocker = gate.blocker!;
  const stats = quizStats(data, blocker.quiz);
  return (
    <Card className="p-8 text-center anim-rise" data-testid="locked">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-2 text-muted">
        <IconLock size={26} />
      </span>
      <div className="mt-4 text-xl font-bold">נעול עדיין</div>
      <p className="num mx-auto mt-2 max-w-md text-ink-2">
        כדי לפתוח, צריך לעבור את המבחן של <span className="font-semibold text-ink">{itemTitle(data, blocker)}</span> בציון{" "}
        {stats.passing}% לפחות
        {stats.best ? ` (הציון הגבוה שלך עד עכשיו: ${stats.best.percent}%)` : ""}.
      </p>
      <Link
        href={itemHref(blocker)}
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
        data-testid="go-blocker"
      >
        עבור למבחן הנדרש
      </Link>
    </Card>
  );
}
