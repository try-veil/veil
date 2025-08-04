"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QueryPair {
  id: string;
  key: string;
  value: string;
}

interface QueryProps {
  onQueryChange?: (queries: QueryPair[]) => void;
}

function SortableQueryItem({ query, index, updateQuery, removeQuery }: {
  query: QueryPair;
  index: number;
  updateQuery: (id: string, field: "key" | "value", value: string) => void;
  removeQuery: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: query.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <div className="flex-1 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`key-${query.id}`}>
            {index === 0 ? "Query Key" : "Add Query Key"}
          </Label>
          <Input
            id={`key-${query.id}`}
            placeholder={index === 0 ? "page" : "Add Query Key"}
            value={query.key}
            onChange={(e) => updateQuery(query.id, "key", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`value-${query.id}`}>
            {index === 0 ? "Query Value" : "Add Query Value"}
          </Label>
          <div className="flex gap-2">
            <Input
              id={`value-${query.id}`}
              placeholder={index === 0 ? "1" : "Add Query Value"}
              value={query.value}
              onChange={(e) => updateQuery(query.id, "value", e.target.value)}
            />
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeQuery(query.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Query({ onQueryChange }: QueryProps) {
  const [queries, setQueries] = useState<QueryPair[]>([
    { id: "1", key: "", value: "" }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const notifyQueryChange = (queriesList: QueryPair[]) => {
    if (onQueryChange) {
      const validQueries = queriesList.filter(
        query => query.key.trim() !== '' && query.value.trim() !== ''
      );
      onQueryChange(validQueries);
    }
  };

  const addNewQuery = () => {
    const newQueries = [...queries, { id: Date.now().toString(), key: "", value: "" }];
    setQueries(newQueries);
    notifyQueryChange(newQueries);
  };

  const updateQuery = (id: string, field: "key" | "value", value: string) => {
    const newQueries = queries.map((query) =>
      query.id === id ? { ...query, [field]: value } : query
    );
    setQueries(newQueries);
    notifyQueryChange(newQueries);
  };

  const removeQuery = (id: string) => {
    const newQueries = queries.filter((query) => query.id !== id);
    setQueries(newQueries);
    notifyQueryChange(newQueries);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queries.findIndex((query) => query.id === active.id);
      const newIndex = queries.findIndex((query) => query.id === over.id);
      const newQueries = arrayMove(queries, oldIndex, newIndex);
      setQueries(newQueries);
      notifyQueryChange(newQueries);
    }
  };

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={queries} strategy={verticalListSortingStrategy}>
          {queries.map((query, index) => (
            <SortableQueryItem
              key={query.id}
              query={query}
              index={index}
              updateQuery={updateQuery}
              removeQuery={removeQuery}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        variant="outline"
        className="w-full"
        onClick={addNewQuery}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Query Parameter
      </Button>
    </div>
  );
} 