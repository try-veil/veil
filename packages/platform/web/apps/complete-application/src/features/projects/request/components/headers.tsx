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

interface HeaderPair {
  id: string;
  name: string;
  value: string;
}

function SortableHeaderItem({ header, index, updateHeader, removeHeader }: {
  header: HeaderPair;
  index: number;
  updateHeader: (id: string, field: "name" | "value", value: string) => void;
  removeHeader: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: header.id });

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
          <Label htmlFor={`name-${header.id}`}>
            {index === 0 ? "Header Name" : "Add Header Name"}
          </Label>
          <Input
            id={`name-${header.id}`}
            placeholder={index === 0 ? "Content-Type" : "Add Header Name"}
            value={header.name}
            onChange={(e) => updateHeader(header.id, "name", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`value-${header.id}`}>
            {index === 0 ? "Header Value" : "Add Header Value"}
          </Label>
          <div className="flex gap-2">
            <Input
              id={`value-${header.id}`}
              placeholder={index === 0 ? "application/json" : "Add Header Value"}
              value={header.value}
              onChange={(e) => updateHeader(header.id, "value", e.target.value)}
            />
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeHeader(header.id)}
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

export function Headers() {
  const [headers, setHeaders] = useState<HeaderPair[]>([
    { id: "1", name: "", value: "" }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addNewHeader = () => {
    setHeaders([...headers, { id: Date.now().toString(), name: "", value: "" }]);
  };

  const updateHeader = (id: string, field: "name" | "value", value: string) => {
    setHeaders(
      headers.map((header) =>
        header.id === id ? { ...header, [field]: value } : header
      )
    );
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter((header) => header.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = headers.findIndex((header) => header.id === active.id);
      const newIndex = headers.findIndex((header) => header.id === over.id);

      setHeaders(arrayMove(headers, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-4 max-h-[300px] overflow-y-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={headers} strategy={verticalListSortingStrategy}>
          {headers.map((header, index) => (
            <SortableHeaderItem
              key={header.id}
              header={header}
              index={index}
              updateHeader={updateHeader}
              removeHeader={removeHeader}
            />
          ))}
        </SortableContext>
      </DndContext>
      <Button
        variant="outline"
        className="w-full"
        onClick={addNewHeader}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Header
      </Button>
    </div>
  );
} 