import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cn } from '../utils/cn';

const CONTROL =
  'block h-10 w-full rounded-md border border-gray-500 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-navy-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

/** Label, control and message, wired together for screen readers. */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-900">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-700">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const ariaFor = (id: string, error?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
});

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(({ id, label, error, hint, className, ...props }, ref) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <Field id={fieldId} label={label} error={error} hint={hint}>
      <input
        ref={ref}
        id={fieldId}
        className={cn(CONTROL, error && 'border-red-700', className)}
        {...ariaFor(fieldId, error)}
        {...props}
      />
    </Field>
  );
});
Input.displayName = 'Input';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(({ id, label, error, hint, className, ...props }, ref) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <Field id={fieldId} label={label} error={error} hint={hint}>
      <select
        ref={ref}
        id={fieldId}
        className={cn(CONTROL, error && 'border-red-700', className)}
        {...ariaFor(fieldId, error)}
        {...props}
      />
    </Field>
  );
});
Select.displayName = 'Select';
