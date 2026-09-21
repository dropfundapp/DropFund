import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TransactionSuccessDialogProps {
  amount: number;
  title: string;
  onClose: () => void;
  embedded?: boolean;
}

export default function TransactionSuccessDialog({ amount, title, onClose, embedded = false }: TransactionSuccessDialogProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), 1_300);
    const closeTimer = window.setTimeout(onClose, 1_600);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(closeTimer);
    };
  }, [onClose]);

  const content = (
    <div className={`${isExiting ? 'dropfund-success-exit' : 'dropfund-success-enter'} w-full max-w-[320px] rounded-[24px] border border-[#252528] bg-[#181819] p-8 text-center text-white shadow-2xl`}>
      <div className={`dropfund-success-check ${isExiting ? 'dropfund-success-check-exit' : ''} mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#58d16e] text-black`}>
        <Check className="h-9 w-9" strokeWidth={3} />
      </div>
      <p className="mt-5 text-3xl font-semibold">${amount.toFixed(2)} <span className="text-base font-medium text-white/55">USDC</span></p>
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
    </div>
  );

  return embedded ? content : <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 pointer-events-none">{content}</div>;
}