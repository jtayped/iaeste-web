"use client";

import {
  Checkbox,
  CheckboxContent,
  CheckboxControl,
  CheckboxIndicator,
} from "@repo/ui/checkbox";

export function SelectionCheckbox({
  label,
  selected,
  indeterminate = false,
  disabled = false,
  onChange,
}: {
  label: string;
  selected: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <Checkbox
      isSelected={selected}
      isIndeterminate={indeterminate}
      isDisabled={disabled}
      onChange={onChange}
    >
      <CheckboxContent className="flex size-11 items-center justify-center sm:size-8">
        <CheckboxControl className="size-4">
          <CheckboxIndicator />
        </CheckboxControl>
        <span className="sr-only">{label}</span>
      </CheckboxContent>
    </Checkbox>
  );
}
