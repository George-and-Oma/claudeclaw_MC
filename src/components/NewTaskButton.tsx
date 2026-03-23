'use client';

export default function NewTaskButton() {
  return (
    <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
      <span>+</span>
      <span>New task</span>
    </button>
  );
}
