import * as React from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AutocompleteItem {
  value: string
  label: string
}

interface AutocompleteProps {
  items: AutocompleteItem[]
  placeholder?: string
  emptyMessage?: string
  value: string
  onValueChange: (value: string) => void
  onSelect?: (item: AutocompleteItem) => void
  className?: string
}

export function Autocomplete({
  items,
  placeholder = "Search...",
  emptyMessage = "No results found.",
  value,
  onValueChange,
  onSelect,
  className
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleSelect = (selectedValue: string) => {
    const item = items.find(item => item.value === selectedValue)
    if (item) {
      setInputValue(item.label)
      onValueChange(item.label)
      onSelect?.(item)
      setOpen(false)
    }
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onValueChange(newValue)
    if (!open) setOpen(true)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            className={cn("w-full", className)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-2"
            onClick={() => setOpen(!open)}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items
                .filter(item => 
                  item.label.toLowerCase().includes(inputValue.toLowerCase()) ||
                  item.value.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={handleSelect}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}