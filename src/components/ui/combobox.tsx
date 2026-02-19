"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean;
  createLabel?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyText = "Không tìm thấy.",
  disabled = false,
  className,
  allowCreate = true,
  createLabel = "Thêm mới",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Include current value in options if not already present
  const allOptions = React.useMemo(() => {
    if (value && !options.find((opt) => opt.value === value)) {
      return [{ value, label: value }, ...options];
    }
    return options;
  }, [options, value]);

  const selectedOption = allOptions.find((option) => option.value === value);

  const handleSelect = (selectedValue: string) => {
    // cmdk v1.x may pass original or lowercased value depending on version
    const option = allOptions.find(
      (opt) =>
        opt.label.toLowerCase() === selectedValue.toLowerCase() ||
        opt.value.toLowerCase() === selectedValue.toLowerCase()
    );
    if (option) {
      onValueChange?.(option.value === value ? "" : option.value);
    }
    setSearchValue("");
    setOpen(false);
  };

  const handleItemClick = (option: ComboboxOption) => {
    onValueChange?.(option.value === value ? "" : option.value);
    setSearchValue("");
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (searchValue.trim()) {
      onValueChange?.(searchValue.trim());
      setSearchValue("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {allowCreate && searchValue.trim() ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4" />
                  {createLabel}: &quot;{searchValue}&quot;
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {allOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={handleSelect}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleItemClick(option);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {/* Always show create button when typing and value doesn't exactly match existing */}
            {allowCreate && searchValue.trim() && !allOptions.find(
              (opt) => opt.label.toLowerCase() === searchValue.trim().toLowerCase()
            ) && (
              <div className="border-t px-1 py-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded cursor-pointer text-primary"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4" />
                  {createLabel}: &quot;{searchValue.trim()}&quot;
                </button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
