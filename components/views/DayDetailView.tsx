"use client";

import { useState } from "react";
import DayForm from "@/components/forms/DayForm";
import ItemForm from "@/components/forms/ItemForm";
import DayItemRow, { NoteCallout } from "@/components/DayItemRow";
import Header from "@/components/Header";
import HotelCard from "@/components/HotelCard";
import { useToast } from "@/components/Toast";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Sheet from "@/components/ui/Sheet";
import { remove, reorderItems } from "@/lib/api-client";
import { moveId } from "@/lib/day-items";
import { goBack, navigate } from "@/lib/router";
import { itemsForDay } from "@/lib/selectors";
import { formatDay } from "@/lib/stay-dates";
import { useTrip } from "@/lib/store";
import type { DayItem } from "@/lib/types";

export default function DayDetailView({ id }: { id: string }) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [editingDay, setEditingDay] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [adding, setAdding] = useState<"location" | "note" | null>(null);
  const [editingItem, setEditingItem] = useState<DayItem | undefined>();
  const [moving, setMoving] = useState(false);
  const [deleted, setDeleted] = useState(false); // suppress "Not found" flash between prune and navigation
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
  const anytimeIds = anytime.map((i) => i.id);

  async function move(itemId: string, dir: -1 | 1) {
    const next = moveId(anytimeIds, itemId, dir);
    if (!next || moving || !day) return;
    setMoving(true);
    try {
      await reorderItems(day.id, next);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Reorder failed", "error");
    } finally {
      setMoving(false);
    }
  }

  return (
    <>
      <Header
        title={formatDay(day.date)}
        back
        action={
          <button
            type="button"
            aria-label="Edit day"
            disabled={!online}
            onClick={() => setEditingDay(true)}
            className="flex size-11 items-center justify-center rounded-lg text-xl text-zinc-100 active:bg-zinc-800 disabled:opacity-50"
          >
            ✏️
          </button>
        }
      />
      <div className="space-y-4 p-4">
        {day.title && <h2 className="break-words text-xl font-semibold text-zinc-100">{day.title}</h2>}
        {day.note && <NoteCallout note={day.note} />}
        <HotelCard data={data} date={day.date} />
        {timed.length === 0 && anytime.length === 0 && (
          <EmptyState emoji="🗓️" text="Nothing planned yet" />
        )}
        {timed.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-zinc-100">Timed</h3>
            <ul className="space-y-2">
              {timed.map((i) => (
                <DayItemRow key={i.id} item={i} data={data} onEdit={() => setEditingItem(i)} />
              ))}
            </ul>
          </section>
        )}
        {anytime.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-zinc-100">Anytime</h3>
            <ul className="space-y-2">
              {anytime.map((i, idx) => (
                <DayItemRow
                  key={i.id}
                  item={i}
                  data={data}
                  onEdit={() => setEditingItem(i)}
                  move={{
                    onUp: () => void move(i.id, -1),
                    onDown: () => void move(i.id, 1),
                    upDisabled: idx === 0 || moving || !online,
                    downDisabled: idx === anytime.length - 1 || moving || !online,
                  }}
                />
              ))}
            </ul>
          </section>
        )}
        <Button className="w-full" disabled={!online} onClick={() => setChoosing(true)}>
          + Add
        </Button>
      </div>
      <Sheet open={choosing} title="Add to this day" onClose={() => setChoosing(false)}>
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setChoosing(false);
              setAdding("location");
            }}
          >
            📍 Location
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setChoosing(false);
              setAdding("note");
            }}
          >
            📝 Note
          </Button>
        </div>
      </Sheet>
      <ItemForm open={adding !== null} dayId={day.id} mode={adding ?? "location"} onClose={() => setAdding(null)} />
      <ItemForm open={!!editingItem} dayId={day.id} item={editingItem} onClose={() => setEditingItem(undefined)} />
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
