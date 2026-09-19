import * as RadixCheckbox from '@radix-ui/react-checkbox';
import * as RadixRadio from '@radix-ui/react-radio-group';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '../lib/cn';
import './toggles.css';

export interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  label?: string | undefined;
  id?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  'aria-label'?: string | undefined;
}

export function Checkbox({ checked, onCheckedChange, label, id, disabled, className, ...aria }: CheckboxProps) {
  const control = (
    <RadixCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next === true)}
      {...(disabled === undefined ? {} : { disabled })}
      className={cn('omni-checkbox', !label && className)}
      {...aria}
    >
      <RadixCheckbox.Indicator aria-hidden="true">{checked === 'indeterminate' ? '–' : '✓'}</RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (!label) return control;
  return (
    <label className={cn('omni-choice', className)}>
      {control}
      {label}
    </label>
  );
}

export interface RadioGroupProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  name?: string | undefined;
  className?: string | undefined;
}

export function RadioGroup({ value, onValueChange, options, name, className }: RadioGroupProps) {
  return (
    <RadixRadio.Root
      {...(value === undefined ? {} : { value })}
      onValueChange={onValueChange}
      {...(name === undefined ? {} : { name })}
      className={cn('omni-field', className)}
    >
      {options.map((option) => (
        <label key={option.value} className="omni-choice">
          <RadixRadio.Item value={option.value} disabled={option.disabled ?? false} className="omni-radio">
            <RadixRadio.Indicator aria-hidden="true">•</RadixRadio.Indicator>
          </RadixRadio.Item>
          {option.label}
        </label>
      ))}
    </RadixRadio.Root>
  );
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string | undefined;
  id?: string | undefined;
  disabled?: boolean | undefined;
}

export function Switch({ checked, onCheckedChange, label, id, disabled }: SwitchProps) {
  const control = (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      {...(disabled === undefined ? {} : { disabled })}
      className="omni-switch"
      aria-label={label ? undefined : 'toggle'}
    >
      <RadixSwitch.Thumb className="omni-switch-thumb" />
    </RadixSwitch.Root>
  );

  if (!label) return control;
  return (
    <label className="omni-choice">
      {control}
      {label}
    </label>
  );
}
