"use client";

import { useState, KeyboardEvent } from "react";
import { Label } from "@/components/ui";
import { X, Plus } from "lucide-react";


interface TagsInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
}

export function TagsInput({
  label,
  value,
  onChange,
  placeholder = "Appuyez sur Entrée pour ajouter",
  helpText,
  disabled = false,
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
  };

  return (
    <div>
      <Label htmlFor={label}>{label}</Label>
      <div className="flex flex-wrap gap-2 mt-2 p-3 border border-sable rounded-2xl bg-white min-h-[42px]">
        {/* Tags existants */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-sauge/10 text-sauge rounded-2xl text-sm"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-sauge/20 rounded-full p-0.5 transition-colors"
                aria-label={`Supprimer ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {/* Input pour ajouter un nouveau tag */}
        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
            disabled={disabled}
          />
        )}
      </div>
      {helpText && (
        <p className="text-sm text-anthracite/60 mt-1">{helpText}</p>
      )}
      {!disabled && value.length > 0 && (
        <button
          type="button"
          onClick={() => setInputValue("")}
          className="text-xs text-sauge hover:underline mt-1"
          disabled={!inputValue}
        >
          Appuyez sur Entrée ou tapez une virgule pour ajouter
        </button>
      )}
    </div>
  );
}

