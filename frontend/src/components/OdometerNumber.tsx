import { useEffect, useRef } from 'react';
import Odometer from 'odometer';
import 'odometer/themes/odometer-theme-default.css';
import './odometer-number.css';

interface OdometerNumberProps {
  value: string;
}

export default function OdometerNumber({ value }: OdometerNumberProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const odometerRef = useRef<Odometer | null>(null);
  const decimalPlaces = (value.split('.')[1] || '').length;
  const numericValue = Number(value.replace(/,/g, ''));
  const format = decimalPlaces ? `(,ddd).${'d'.repeat(decimalPlaces)}` : '(,ddd)';

  useEffect(() => {
    if (!elementRef.current || odometerRef.current) return;
    odometerRef.current = new Odometer({
      el: elementRef.current,
      value: numericValue,
      duration: 550,
      format,
      theme: 'default',
    });
  }, [format, numericValue]);

  useEffect(() => {
    odometerRef.current?.update(numericValue);
  }, [numericValue]);

  return <span ref={elementRef} className="dropfund-odometer inline-block whitespace-nowrap align-baseline tabular-nums" aria-label={value}>{value}</span>;
}