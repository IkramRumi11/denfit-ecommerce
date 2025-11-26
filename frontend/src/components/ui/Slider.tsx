import React from 'react';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  max: number;
  step: number;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  max,
  step,
  className = ''
}) => {
  return (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      min={0}
      max={max}
      step={step}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${className}`}
      style={{
        background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(value[0] / max) * 100}%, #e5e7eb ${(value[0] / max) * 100}%, #e5e7eb 100%)`
      }}
    />
  );
};
