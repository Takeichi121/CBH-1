import * as React from "react"
import { cn } from "@/lib/utils"

interface FormattedInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value?: string | number;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  allowDecimals?: boolean;
}

const formatNumber = (value: string | number, allowDecimals: boolean): string => {
  if (value === '' || value === undefined || value === null) return '';
  
  const strValue = String(value);
  
  if (strValue === '' || strValue === '-') return strValue;
  
  const parts = strValue.split('.');
  const integerPart = parts[0].replace(/,/g, '');
  
  if (integerPart === '' || integerPart === '-') return strValue;
  
  const numericInt = integerPart.replace(/[^0-9-]/g, '');
  if (numericInt === '' || numericInt === '-') return '';
  
  const formattedInt = parseInt(numericInt, 10).toLocaleString('en-US');
  
  if (allowDecimals && parts.length > 1) {
    return `${formattedInt}.${parts[1]}`;
  }
  
  return formattedInt;
};

const parseNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

const FormattedInput = React.forwardRef<HTMLInputElement, FormattedInputProps>(
  ({ className, value, onChange, allowDecimals = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');
    
    React.useEffect(() => {
      const numValue = parseFloat(String(value).replace(/,/g, '')) || 0;
      if (numValue === 0 && value !== '0' && value !== 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatNumber(value ?? '', allowDecimals));
      }
    }, [value, allowDecimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      const cleanValue = inputValue.replace(/,/g, '');
      
      if (cleanValue === '') {
        setDisplayValue('');
        onChange?.({ target: { value: '0', name: props.name } });
        return;
      }
      
      const regex = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
      if (!regex.test(cleanValue)) {
        return;
      }
      
      setDisplayValue(formatNumber(cleanValue, allowDecimals));
      onChange?.({ target: { value: cleanValue, name: props.name } });
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      const numValue = parseFloat(String(value).replace(/,/g, '')) || 0;
      if (numValue === 0) {
        setDisplayValue('');
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (displayValue === '' || displayValue === '-') {
        setDisplayValue('0');
        onChange?.({ target: { value: '0', name: props.name } });
      }
      props.onBlur?.(e);
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm caret-foreground",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    )
  }
)
FormattedInput.displayName = "FormattedInput"

export { FormattedInput }
