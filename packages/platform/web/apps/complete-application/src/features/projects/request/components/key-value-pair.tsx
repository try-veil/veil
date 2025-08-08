"use client";

import { useState, useEffect } from "react";
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

interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

interface KeyValuePairProps {
  title: string;
  keyLabel: string;
  valueLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addButtonText: string;
  onChange?: (pairs: KeyValuePair[]) => void;
  initialPairs?: { key: string; value: string }[];
}

function SortableKeyValueItem({ 
  pair, 
  index, 
  updatePair, 
  removePair,
  keyLabel,
  valueLabel,
  keyPlaceholder,
  valuePlaceholder,
}: {
  pair: KeyValuePair;
  index: number;
  updatePair: (id: string, field: "key" | "value", value: string) => void;
  removePair: (id: string) => void;
  keyLabel: string;
  valueLabel: string;
  keyPlaceholder: string;
  valuePlaceholder: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: pair.id });

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
          <Label htmlFor={`key-${pair.id}`}>
            {index === 0 ? keyLabel : `${keyLabel}`}
          </Label>
          <Input
            id={`key-${pair.id}`}
            placeholder={index === 0 ? keyPlaceholder : `Add ${keyPlaceholder}`}
            value={pair.key}
            onChange={(e) => updatePair(pair.id, "key", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`value-${pair.id}`}>
            {index === 0 ? valueLabel : `${valueLabel}`}
          </Label>  
          <div className="flex gap-2">
            <Input
              id={`value-${pair.id}`}
              placeholder={index === 0 ? valuePlaceholder : `Add ${valuePlaceholder}`}
              value={pair.value}
              onChange={(e) => updatePair(pair.id, "value", e.target.value)}
            />
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePair(pair.id)}
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

export function KeyValuePair({
  title,
  keyLabel,
  valueLabel,
  keyPlaceholder,
  valuePlaceholder,
  addButtonText,
  onChange,
  initialPairs,
}: KeyValuePairProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(() => {
    if (initialPairs && initialPairs.length > 0) {
      return initialPairs.map((pair, index) => ({
        id: (index + 1).toString(),
        key: pair.key,
        value: pair.value
      }));
    }
    return [{ id: "1", key: "", value: "" }];
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update pairs when initialPairs prop changes
  useEffect(() => {
    if (initialPairs && initialPairs.length > 0) {
      const updatedPairs = initialPairs.map((pair, index) => ({
        id: (index + 1).toString(),
        key: pair.key,
        value: pair.value
      }));
      setPairs(updatedPairs);
    }
  }, [initialPairs]);

  const addNewPair = () => {
    const newPairs = [...pairs, { id: Date.now().toString(), key: "", value: "" }];
    setPairs(newPairs);
    onChange?.(newPairs);
  };

  const updatePair = (id: string, field: "key" | "value", value: string) => {
    const newPairs = pairs.map((pair) =>
      pair.id === id ? { ...pair, [field]: value } : pair
    );
    setPairs(newPairs);
    onChange?.(newPairs);
  };

  const removePair = (id: string) => {
    const newPairs = pairs.filter((pair) => pair.id !== id);
    setPairs(newPairs);
    onChange?.(newPairs);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = pairs.findIndex((pair) => pair.id === active.id);
      const newIndex = pairs.findIndex((pair) => pair.id === over.id);

      const newPairs = arrayMove(pairs, oldIndex, newIndex);
      setPairs(newPairs);
      onChange?.(newPairs);
    }
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pairs} strategy={verticalListSortingStrategy}>
          {pairs.map((pair, index) => (
            <SortableKeyValueItem
              key={pair.id}
              pair={pair}
              index={index}
              updatePair={updatePair}
              removePair={removePair}
              keyLabel={keyLabel}
              valueLabel={valueLabel}
              keyPlaceholder={keyPlaceholder}
              valuePlaceholder={valuePlaceholder}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        variant="outline"
        className="w-full"
        onClick={addNewPair}
      >
        <Plus className="mr-2 h-4 w-4" />
        {addButtonText}
      </Button>
    </div>
  );
} 