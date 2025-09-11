import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface SelectionItem {
  title: string;
  subtitle?: string;
  description?: string;
  onChangeSelection: () => void;
  onEdit?: (newSubtitle?: string, newDescription?: string) => void;
  canEdit?: boolean;
}

interface StackedSelectionCardProps {
  selections: SelectionItem[];
}

// Removed truncation - show full text always

export function StackedSelectionCard({ selections }: StackedSelectionCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleEdit = (index: number, subtitle?: string, description?: string) => {
    setEditingIndex(index);
    setEditSubtitle(subtitle || "");
    setEditDescription(description || "");
  };

  const handleSave = (index: number) => {
    const selection = selections[index];
    if (selection.onEdit) {
      selection.onEdit(editSubtitle, editDescription);
    }
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  return (
    <div className="mb-8 selected-card">
      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {selections.map((selection, index) => (
            <div key={index} className={index > 0 ? "pt-4 border-t border-[#0db0de]/20" : ""}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-[#0db0de]">
                    {selection.title}
                  </span>
                  <span className="text-sm text-[#0db0de]">✓</span>
                </div>
                <div className="flex items-center gap-2">
                  {selection.canEdit && editingIndex !== index && (
                    <button 
                      onClick={() => handleEdit(index, selection.subtitle, selection.description)}
                      className="text-sm text-primary hover:text-primary/80 underline transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={selection.onChangeSelection}
                    className="text-sm text-primary hover:text-primary/80 underline transition-colors"
                  >
                    Change selection
                  </button>
                </div>
              </div>
              
              {editingIndex === index ? (
                <div className="space-y-3">
                  <Textarea
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="Enter text here..."
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => handleSave(index)}>Save</Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  {selection.subtitle && (
                    <p className="text-sm text-muted-foreground mb-1">
                      {selection.subtitle}
                    </p>
                  )}
                  {selection.description && (
                    <p className="text-sm text-muted-foreground">
                      {selection.description}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}