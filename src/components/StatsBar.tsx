'use client';

interface StatsBarProps {
  thisWeek: number;
  inProgress: number;
  total: number;
  completion: number;
}

export default function StatsBar({ thisWeek, inProgress, total, completion }: StatsBarProps) {
  return (
    <div className="grid grid-cols-4 gap-2 md:flex md:items-center md:gap-8 mb-4 md:mb-6">
      <div className="flex flex-col md:flex-row items-center md:gap-2">
        <span className="text-xl md:text-3xl font-bold text-white">{thisWeek}</span>
        <span className="text-xs md:text-sm text-[#666]">This week</span>
      </div>
      <div className="flex flex-col md:flex-row items-center md:gap-2">
        <span className="text-xl md:text-3xl font-bold text-purple-500">{inProgress}</span>
        <span className="text-xs md:text-sm text-[#666]">Active</span>
      </div>
      <div className="flex flex-col md:flex-row items-center md:gap-2">
        <span className="text-xl md:text-3xl font-bold text-white">{total}</span>
        <span className="text-xs md:text-sm text-[#666]">Total</span>
      </div>
      <div className="flex flex-col md:flex-row items-center md:gap-2">
        <span className="text-xl md:text-3xl font-bold text-green-500">{completion}%</span>
        <span className="text-xs md:text-sm text-[#666]">Done</span>
      </div>
    </div>
  );
}
