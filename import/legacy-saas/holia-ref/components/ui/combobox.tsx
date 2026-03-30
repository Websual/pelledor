"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  count?: number; // Nombre de praticiens (optionnel)
  disabled?: boolean; // Si la profession n'est pas disponible
  unavailable?: boolean; // Si la profession est sélectionnée mais non disponible dans la zone
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  buttonClassName?: string;
  maxHeight?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  emptyText = "Aucun résultat",
  className,
  buttonClassName,
  maxHeight = "400px",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleSelect = (optionValue: string) => {
    if (value === optionValue) {
      onValueChange?.("");
    } else {
      onValueChange?.(optionValue);
    }
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
    setSearchQuery("");
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (open && !(event.target as Element).closest('[data-combobox]')) {
        setOpen(false);
        setSearchQuery("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className={cn("relative", className)} data-combobox>
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:shadow-md bg-white text-gray-700 border border-gray-200 shadow-sm min-w-[140px]",
          value && "bg-[#9bb49b] text-white border-transparent",
          buttonClassName
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between gap-2 flex-1 text-left"
        >
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="hover:bg-white/20 rounded-full p-0.5 transition-colors flex-shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 z-[1200] min-w-[280px] w-full">
          <div className="p-2">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#9bb49b] focus:border-transparent"
              autoFocus
            />
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              <div className="py-2">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors",
                      option.disabled 
                        ? "opacity-50 cursor-not-allowed text-gray-400"
                        : "hover:bg-gray-50",
                      value === option.value && !option.unavailable && "text-[#9bb49b] font-medium bg-[#9bb49b]/5",
                      value === option.value && option.unavailable && "text-gray-500 font-medium bg-gray-100"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className={cn(
                      "flex-1",
                      option.unavailable && "text-gray-500"
                    )}>{option.label}</span>
                    {option.count !== undefined && (
                      <span className={cn(
                        "text-xs flex-shrink-0",
                        option.unavailable ? "text-gray-400" : "text-gray-500"
                      )}>
                        {option.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
