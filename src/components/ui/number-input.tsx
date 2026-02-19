import * as React from "react"
import { cn } from "@/lib/utils"

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Allow decimal values (default: false for integers) */
  allowDecimal?: boolean;
  /** Default value when input is empty (default: null) */
  emptyValue?: number | null;
  /** Minimum value (default: undefined) */
  min?: number;
  /** Maximum value (default: undefined) */
  max?: number;
  /** Step for increment/decrement (default: 1 or 0.01 for decimals) */
  step?: number;
}

/**
 * NumberInput component that properly handles:
 * - Leading zeros (08 → 8)
 * - Empty values
 * - Integer vs decimal inputs
 * - Min/max constraints
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({
    className,
    value,
    onChange,
    allowDecimal = false,
    emptyValue = null,
    min,
    max,
    step,
    onBlur,
    ...props
  }, ref) => {
    // Local state for the display value (allows typing "0." for decimals)
    const [displayValue, setDisplayValue] = React.useState<string>(() =>
      value !== null && value !== undefined ? String(value) : ''
    );

    // Sync display value when external value changes
    React.useEffect(() => {
      const newDisplayValue = value !== null && value !== undefined ? String(value) : '';
      const refElement = ref && typeof ref !== 'function' ? ref.current : null;
      if (displayValue !== newDisplayValue && !document.activeElement?.isSameNode(refElement)) {
        setDisplayValue(newDisplayValue);
      }
    }, [value]);

    const parseValue = (str: string): number | null => {
      if (str === '' || str === '-') return emptyValue;

      // Remove leading zeros but keep "0" and "0.x"
      let cleaned = str;
      if (!allowDecimal) {
        // For integers, strip all leading zeros
        cleaned = str.replace(/^(-?)0+(?=\d)/, '$1');
      } else {
        // For decimals, keep "0." but strip leading zeros from whole part
        cleaned = str.replace(/^(-?)0+(?=\d)(?!\.)/, '$1');
      }

      const parsed = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);

      if (isNaN(parsed)) return emptyValue;

      // Apply min/max constraints
      let result = parsed;
      if (min !== undefined && result < min) result = min;
      if (max !== undefined && result > max) result = max;

      return result;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty input
      if (inputValue === '') {
        setDisplayValue('');
        onChange(emptyValue);
        return;
      }

      // Allow typing "-" for negative numbers
      if (inputValue === '-') {
        setDisplayValue('-');
        return;
      }

      // Validate input pattern
      const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
      if (!pattern.test(inputValue)) {
        return; // Invalid input, ignore
      }

      // Allow intermediate states like "5." for decimals
      if (allowDecimal && inputValue.endsWith('.')) {
        setDisplayValue(inputValue);
        return;
      }

      setDisplayValue(inputValue);
      const parsed = parseValue(inputValue);
      if (parsed !== value) {
        onChange(parsed);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // On blur, format the display value properly
      const parsed = parseValue(displayValue);
      const formatted = parsed !== null ? String(parsed) : '';
      setDisplayValue(formatted);

      // Ensure onChange is called with final value
      if (parsed !== value) {
        onChange(parsed);
      }

      onBlur?.(e);
    };

    return (
      <input
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background pl-4 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
