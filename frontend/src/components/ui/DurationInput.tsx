import React, { useState } from 'react';
import { minutesToLabel, hhmmToMinutes } from '../../utils/time';

interface DurationInputProps {
  value: string; // HH:MM format
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

function isValidHHMM(val: string): boolean {
  const parts = val.split(':');
  if (parts.length !== 2) return false;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return false;
  if (m < 0 || m > 59) return false;
  if (h < 0) return false;
  return true;
}

export const DurationInput = React.forwardRef<HTMLInputElement, DurationInputProps>(
  ({ value, onChange, label, error, required, disabled }, ref) => {
    const [localError, setLocalError] = useState('');

    const handleBlur = () => {
      if (!value) {
        setLocalError('');
        return;
      }
      if (!isValidHHMM(value)) {
        setLocalError('Formato inválido. Use HH:MM (ej. 01:30)');
      } else {
        setLocalError('');
        // Normalize: ensure parts are padded
        const parts = value.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        onChange(normalized);
      }
    };

    const displayedMinutes = isValidHHMM(value) ? hhmmToMinutes(value) : null;
    const displayLabel = displayedMinutes != null && displayedMinutes > 0
      ? minutesToLabel(displayedMinutes)
      : null;

    const displayError = error || localError;
    const inputId = label?.toLowerCase().replace(/\s+/g, '-') ?? 'duration-input';

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            id={inputId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="HH:MM"
            disabled={disabled}
            className={[
              'block w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'disabled:bg-gray-50 disabled:text-gray-500',
              displayError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300',
            ].join(' ')}
          />
          {displayLabel && (
            <span className="text-sm text-gray-500 whitespace-nowrap">{displayLabel}</span>
          )}
        </div>
        {displayError && <p className="text-xs text-red-600">{displayError}</p>}
      </div>
    );
  }
);

DurationInput.displayName = 'DurationInput';
