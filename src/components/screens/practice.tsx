"use client";

import Link from "next/link";
import { useState } from "react";
import { mistakes, questionSource } from "@/lib/progress";
import type { CourseData, QuizQuestion } from "@/lib/types";
import { WithData } from "../app-shell";
import { IconCheck, IconTarget } from "../icons";
import { PracticeFlow } from "../quiz/practice";
import { Button, Card, PageHeader } from "../ui";

/** Course-wide mistakes practice: every question whose latest answer was wrong. */
export function PracticeScreen() {
  return <WithData>{(data) => <PracticeView data={data} />}</WithData>;
}

function PracticeView({ data }: { data: CourseData }) {
  const all = mistakes(data);
  const [session, setSession] = useState<QuizQuestion[] | null>(null);

  const groups = new Map<string, { label: string; href: string; count: number }>();
  for (const q of all) {
    const s = questionSource(data, q);
    const g = groups.get(s.href) ?? { ...s, count: 0 };
    g.count++;
    groups.set(s.href, g);
  }

  return (
    <div>
      <PageHeader eyebrow="תרגול" title="חזרה על טעויות">
        כל השאלות שהתשובה האחרונה שלך עליהן הייתה שגויה, מכל הקורס. תשובה נכונה מוציאה שאלה מהרשימה.
      </PageHeader>

      {session ? (
        <Card className="p-5 sm:p-7">
          <PracticeFlow
            questions={session}
            onExit={() => setSession(null)}
            sourceOf={(q) => <span className="ut truncate">· {questionSource(data, q).label}</span>}
          />
        </Card>
      ) : all.length === 0 ? (
        <Card className="p-10 text-center" data-testid="no-mistakes">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
            <IconCheck size={28} strokeWidth={2.4} />
          </span>
          <div className="mt-4 text-lg font-semibold">אין טעויות פתוחות</div>
          <p className="mt-1 text-sm text-ink-2">שאלות שתטעה בהן במבחנים יופיעו כאן לתרגול.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-warn-soft text-warn">
                <IconTarget size={24} />
              </span>
              <div>
                <div className="num text-3xl font-bold" data-testid="mistakes-total">
                  {all.length}
                </div>
                <div className="text-sm text-ink-2">שאלות לחזרה</div>
              </div>
            </div>
            <Button size="lg" onClick={() => setSession(all)} data-testid="start-practice">
              התחל תרגול
            </Button>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3 text-sm font-semibold">לפי מקור</div>
            <ul className="divide-y divide-line">
              {[...groups.values()].map((g) => (
                <li key={g.href} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <Link href={g.href} className="ut min-w-0 truncate font-medium hover:text-accent">
                    {g.label}
                  </Link>
                  <span className="num shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">{g.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
