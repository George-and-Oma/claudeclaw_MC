'use client';

import NewTaskButton from './NewTaskButton';

const filters = ['Alex', 'Henry', 'All projects'];

export default function FilterBar() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <NewTaskButton />
      <div className="flex items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            className="text-sm text-[#a0a0a0] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors"
          >
            {filter}
          </button>
        ))}
        <button className="text-sm text-[#666] hover:text-white px-2 py-1.5 transition-colors">
          ▼
        </button>
      </div>
    </div>
  );
}
