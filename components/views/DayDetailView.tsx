"use client";

import { useRef, useState } from "react";
import DayForm from "@/components/forms/DayForm";
import ItemForm from "@/components/forms/ItemForm";
import DayItemRow, { NoteCallout } from "@/components/DayItemRow";
import Header from "@/components/Header";
import HotelCard from "@/components/HotelCard";
import { useToast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import IconButton from "@/components/ui/IconButton";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";
import { SECTION_HEADING } from "@/components/ui/styles";
import { remove, reorderItems } from "@/lib/api-client";
import { moveId } from "@/lib/day-items";
import { goBack, navigate } from "@/lib/router";
import { itemsForDay } from "@/lib/selectors";
import { useToday } from "@/components/ui/useToday";
import { formatDay } from "@/lib/stay-dates";
import { useTrip } from "@/lib/store";
import { adjacentDayIds, dayNumber, swipeDirection } from "@/lib/trip";

// Direction of the last prev/next change, so the incoming day slides in from that side.
let lastStep: { dir: "next" | "prev"; at: number } | null = null;

function goToDay(id: string, dir: "next" | "prev") {
  lastStep = { dir, at: Date.now() };
  navigate(`/day/${encodeURIComponent(id)}`, { replace: true }); // Back returns to the list, not through each day
}

// Keyed by id: per-day UI state (sheets, reorder, expanded areas) resets on prev/next.
export default function DayDetailView({ id }: { id: string }) {
  return <DayDetail key={id} id={id} />;
}

function DayDetail({ id }: { id: string }) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [editingDay, setEditingDay] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [moving, setMoving] = useState(false);
  const [deleted, setDeleted] = useState(false); // suppress "Not found" flash between prune and navigation
  const [enter] = useState(() => (lastStep && Date.now() - lastStep.at < 1000 ? lastStep.dir : null));
  const content = useRef<HTMLDivElement>(null);
  const today = useToday();
  const touch = useRef<{ x: number; y: number; dx: number; dy: number; axis: "x" | "y" | null } | null>(null);

  if (!data) return null;

  const day = data.days.find((d) => d.id === id);
  if (!day && deleted) return null;
  if (!day) {
    return (
      <>
        <Header title="Day" back />
        <EmptyState emoji="🤷" text="Not found" cta={{ label: "Back", onClick: goBack }} />
      </>
    );
  }

  const { timed, anytime } = itemsForDay(data, day.id);
  const editingItem = editingItemId ? data.items.find((i) => i.id === editingItemId) : undefined; // closes if it disappears
  const anytimeIds = anytime.map((i) => i.id);
  const { prev, next } = adjacentDayIds(data.days, day.id);
  const firstDate = data.days.reduce((min, d) => (d.date < min ? d.date : min), day.date);
  const n = dayNumber(firstDate, day.date);
  const isToday = day.date === today;
  const empty = timed.length === 0 && anytime.length === 0;
  const canReorder = anytime.length > 1;
  const reorderOn = reordering && canReorder;

  async function move(itemId: string, dir: -1 | 1) {
    const order = moveId(anytimeIds, itemId, dir);
    if (!order || moving || !day) return;
    setMoving(true);
    try {
      await reorderItems(day.id, order);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Reorder failed", "error");
    } finally {
      setMoving(false);
    }
  }

  // Horizontal swipe on the content: left = next day, right = previous. The page follows the
  // finger (damped, stiffer at the ends); vertical scrolling and pinch-zoom stay native (touch-action).
  const setShift = (px: number, animate: boolean) => {
    const el = content.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms ease-out" : "none";
    el.style.transform = px ? `translateX(${px}px)` : "";
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touch.current = null;
      return;
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, dy: 0, axis: null };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = touch.current;
    if (!t) return;
    t.dx = e.touches[0].clientX - t.x;
    t.dy = e.touches[0].clientY - t.y;
    if (!t.axis && Math.hypot(t.dx, t.dy) > 10) t.axis = Math.abs(t.dx) > Math.abs(t.dy) ? "x" : "y";
    if (t.axis !== "x") return;
    const target = t.dx < 0 ? next : prev;
    setShift(t.dx * (target ? 0.4 : 0.12), false);
  };
  const onTouchEnd = () => {
    const t = touch.current;
    touch.current = null;
    if (!t || t.axis !== "x") return;
    setShift(0, true);
    const dir = swipeDirection(t.dx, t.dy);
    const target = dir === "next" ? next : dir === "prev" ? prev : null;
    if (dir && target) goToDay(target, dir);
  };
  // The system took the gesture (e.g. iOS edge-swipe Back): snap back, never navigate.
  const onTouchCancel = () => {
    touch.current = null;
    setShift(0, true);
  };

  const enterClass =
    enter === "next" ? "motion-safe:animate-[day-in-right_220ms_ease-out]" : enter === "prev" ? "motion-safe:animate-[day-in-left_220ms_ease-out]" : "";

  return (
    <>
      <Header
        title={formatDay(day.date)}
        back
        action={
          <>
            {/* Day stepper: a grouped pill, visually distinct from the plain Back chevron. */}
            <div role="group" aria-label="Change day" className="mr-1 flex items-center rounded-full bg-zinc-900 ring-1 ring-white/10">
              <IconButton label="Previous day" disabled={!prev} onClick={() => prev && goToDay(prev, "prev")}>
                <ChevronLeftIcon size={20} />
              </IconButton>
              <span className="min-w-12 text-center text-sm font-semibold tabular-nums text-zinc-300">Day {n}</span>
              <IconButton label="Next day" disabled={!next} onClick={() => next && goToDay(next, "next")}>
                <ChevronRightIcon size={20} />
              </IconButton>
            </div>
            <IconButton label="Edit day" disabled={!online} onClick={() => setEditingDay(true)}>
              <PencilIcon size={22} />
            </IconButton>
          </>
        }
      />
      <div
        className="min-h-[calc(100dvh-4rem-1px-env(safe-area-inset-top)-var(--nav-h))] [touch-action:pan-y_pinch-zoom] overflow-x-clip"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div ref={content} className={`space-y-6 px-4 pb-4 pt-5 ${enterClass}`}>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400">
                Day {n}
                {isToday && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-white">Today</span>}
              </p>
              {day.title && <h2 className="break-words text-2xl font-bold leading-tight tracking-tight text-zinc-100">{day.title}</h2>}
            </div>
            {day.note && <NoteCallout note={day.note} />}
            <HotelCard data={data} date={day.date} />
          </div>

          {empty && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-800 px-6 py-10 text-center">
              <span aria-hidden="true" className="text-4xl">🗺️</span>
              <div className="space-y-1">
                <p className="text-base font-medium text-zinc-100">Nothing planned yet</p>
                <p className="text-sm text-zinc-400">Add places to visit, or a note like train times.</p>
              </div>
              {online && (
                <Button onClick={() => setAdding(true)}>
                  <PlusIcon size={20} />
                  Add a place
                </Button>
              )}
            </div>
          )}

          {timed.length > 0 && (
            <section className="space-y-3" aria-labelledby="schedule-h">
              <h3 id="schedule-h" className={SECTION_HEADING}>Schedule</h3>
              <ol>
                {timed.map((i, idx) => (
                  <li key={i.id} className="grid grid-cols-[2.75rem_0.75rem_minmax(0,1fr)] gap-x-2">
                    <time className="pt-3.5 text-right text-base font-semibold tabular-nums leading-6 text-zinc-100">{i.time}</time>
                    <div aria-hidden="true" className="relative flex justify-center">
                      {timed.length > 1 && (
                        <span
                          className={`absolute w-px bg-zinc-800 ${idx === 0 ? "top-6" : "top-0"} ${idx === timed.length - 1 ? "h-6" : "bottom-0"}`}
                        />
                      )}
                      <span className="relative mt-[1.125rem] size-3 rounded-full bg-red-500 ring-4 ring-zinc-950" />
                    </div>
                    <div className={idx === timed.length - 1 ? "" : "pb-3"}>
                      <DayItemRow item={i} data={data} onEdit={() => setEditingItemId(i.id)} />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {anytime.length > 0 && (
            <section className="space-y-3" aria-labelledby="anytime-h">
              <div className="flex min-h-6 items-center justify-between">
                <h3 id="anytime-h" className={SECTION_HEADING}>Anytime</h3>
                {canReorder && (
                  <button
                    type="button"
                    aria-pressed={reorderOn}
                    disabled={!online && !reorderOn}
                    onClick={() => setReordering((r) => !r)}
                    className="-my-2.5 -mr-2 min-h-11 rounded-full px-3 text-sm font-semibold text-red-400 active:bg-zinc-800 disabled:text-zinc-600"
                  >
                    {reorderOn ? "Done" : "Reorder"}
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {anytime.map((i, idx) => (
                  <li key={i.id}>
                    <DayItemRow
                      item={i}
                      data={data}
                      onEdit={() => setEditingItemId(i.id)}
                      reorder={
                        reorderOn
                          ? {
                              onUp: () => void move(i.id, -1),
                              onDown: () => void move(i.id, 1),
                              upDisabled: idx === 0 || moving || !online,
                              downDisabled: idx === anytime.length - 1 || moving || !online,
                            }
                          : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {!empty && <Fab label="Add to day" disabled={!online} onClick={() => setAdding(true)} />}
      </div>
      <ItemForm open={adding} dayId={day.id} onClose={() => setAdding(false)} />
      <ItemForm open={!!editingItem} dayId={day.id} item={editingItem} onClose={() => setEditingItemId(null)} />
      <DayForm
        open={editingDay}
        day={day}
        onClose={() => setEditingDay(false)}
        onDelete={async () => {
          setDeleted(true); // before the write: prune re-renders synchronously with the day gone
          try {
            await remove("days", day.id);
          } catch (e) {
            setDeleted(false);
            throw e;
          }
          navigate("/");
          toast.show("Day deleted");
        }}
      />
    </>
  );
}
