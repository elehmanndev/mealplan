'use client';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

/** UISwitch: 51×31 track, systemGreen when on, white knob with drop shadow. */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative shrink-0 w-[51px] h-[31px] rounded-full transition-colors duration-200',
        checked ? 'bg-success' : 'bg-fill',
      ].join(' ')}
    >
      <span
        className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white transition-transform duration-300 ease-ios"
        style={{
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06)',
        }}
      />
    </button>
  );
}
