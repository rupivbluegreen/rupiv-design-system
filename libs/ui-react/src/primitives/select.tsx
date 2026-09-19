import * as RadixSelect from '@radix-ui/react-select';
import { cn } from '../lib/cn';
import './select.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string | undefined;
  id?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
}

/** Built on Radix so keyboard behaviour, typeahead and focus management are inherited rather than reimplemented — and are right in RTL. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  disabled,
  className,
  ...aria
}: SelectProps) {
  return (
    <RadixSelect.Root
      {...(value === undefined ? {} : { value })}
      onValueChange={onValueChange}
      {...(disabled === undefined ? {} : { disabled })}
    >
      <RadixSelect.Trigger id={id} className={cn('omni-select-trigger', className)} {...aria}>
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon aria-hidden="true">▾</RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content className="omni-select-content" position="popper" sideOffset={4}>
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled ?? false}
                className="omni-select-item"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
