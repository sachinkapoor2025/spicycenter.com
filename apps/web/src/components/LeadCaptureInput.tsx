"use client";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  onDebouncedChange?: (value: string) => void;
}

export function LeadCaptureInput({ label, onDebouncedChange, onChange, ...props }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        onChange={(e) => {
          onChange?.(e);
          onDebouncedChange?.(e.target.value);
        }}
        {...props}
      />
    </div>
  );
}
