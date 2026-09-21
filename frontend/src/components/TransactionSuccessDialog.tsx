import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransactionSuccessDialogProps {
  amount: number;
  title: string;
  description: string;
  onClose: () => void;
}

export default function TransactionSuccessDialog({ amount, title, description, onClose }: TransactionSuccessDialogProps) {
  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 backdrop-blur-[3px]">
      <div className="w-full max-w-sm rounded-[24px] border border-[#252528] bg-[#181819] p-6 text-center text-white shadow-2xl">
        <div className="dropfund-success-check mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#58d16e] text-black">
          <Check className="h-9 w-9" strokeWidth={3} />
        </div>
        <h2 className="mt-5 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-white/55">{description}</p>
        <p className="mt-5 text-3xl font-semibold">${amount.toFixed(2)} <span className="text-base font-medium text-white/55">USDC</span></p>
        <Button type="button" className="mt-6 h-12 w-full bg-[#58d16e] font-semibold text-black hover:bg-[#6ee67f]" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}