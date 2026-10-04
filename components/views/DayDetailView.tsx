"use client";

import { useState } from "react";
import DayForm from "@/components/forms/DayForm";
import ItemForm from "@/components/forms/ItemForm";
import DayItemRow, { NoteCallout } from "@/components/DayItemRow";
import Header from "@/components/Header";
import HotelCard from "@/components/HotelCard";
import { useToast } from "@/components/Toast";
import EmptyState from "@/components/ui/EmptyState";
import Fab from "@/components/ui/Fab";
import IconButton from "@/components/ui/IconButton";
import { PencilIcon } from "@/components/ui/icons";
import { SECTION_HEADING } from "@/components/ui/styles";
import { remove, reorderItems } from "@/lib/api-client";
import { moveId } from "@/lib/day-items";
import { goBack, navigate } from "@/lib/router";
import { itemsForDay } from "@/lib/selectors";
import { formatDay } from "@/lib/stay-dates";
import { useTrip } from "@/lib/store";

export default function DayDetailView({ id }: { id: string }) {
  const { data, online } = useTrip();
  const toast = useToast();
  const [editingDay, setEditingDay] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
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
  const editingItem = editingItemId ? data.items.find((i) => i.id === editingItemId) : undefined; // closes if it disappears
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
          <IconButton label="Edit day" disabled={!online} onClick={() => setEditingDay(true)}>
            <PencilIcon size={22} />
          </IconButton>
        }
      />
      <div className="space-y-4 p-4">
        {day.title && <h2 className="break-words text-xl font-semibold text-zinc-100">{day.title}</h2>}
        {day.note && <NoteCallout note={day.note} />}
        <HotelCard data={data} date={day.date} />
        {timed.length === 0 && anytime.length === 0 && (
          <EmptyState emoji="🗓️" text="Nothing planned yet" cta={online ? { label: "Add a place", onClick: () => setAdding(true) } : undefined} />
        )}
        {timed.length > 0 && (
          <section className="space-y-2">
            <h3 className={SECTION_HEADING}>Schedule</h3>
            <ul className="space-y-2">
              {timed.map((i) => (
                <DayItemRow key={i.id} item={i} data={data} onEdit={() => setEditingItemId(i.id)} />
              ))}
            </ul>
          </section>
        )}
        {anytime.length > 0 && (
          <section className="space-y-2">
            <h3 className={SECTION_HEADING}>Anytime</h3>
            <ul className="space-y-2">
              {anytime.map((i, idx) => (
                <DayItemRow
                  key={i.id}
                  item={i}
                  data={data}
                  onEdit={() => setEditingItemId(i.id)}
                  move={anytime.length < 2 ? undefined : {
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
      </div>
      <Fab label="Add to day" disabled={!online} onClick={() => setAdding(true)} />
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
