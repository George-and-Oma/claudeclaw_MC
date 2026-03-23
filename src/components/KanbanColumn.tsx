'use client';

import { useState } from 'react';
import TaskCard, { Task } from './TaskCard';

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  color: string;
  onTaskUpdate: () => void;
  onDrop: (taskId: string, newStatus: string) => void;
  onEditTask: (task: Task) => void;
}

export default function KanbanColumn({ title, status, tasks, color, onTaskUpdate, onDrop, onEditTask }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    if (taskId && currentStatus !== status) {
      onDrop(taskId, status);
    }
  };

  return (
    <div
      className={`flex-shrink-0 w-[260px] md:w-auto md:flex-1 md:min-w-[280px] md:max-w-[320px] transition-all ${
        isDragOver ? 'bg-[#1a1a1a] rounded-lg' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-white">{title}</span>
          <span className="text-xs text-[#666] bg-[#1f1f1f] px-1.5 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className={`kanban-column space-y-2 min-h-[100px] ${isDragOver ? 'border-2 border-dashed border-purple-500/50 rounded-lg p-2' : ''}`}>
        {tasks.length === 0 ? (
          <div className="text-center text-[#666] text-sm py-8">No tasks</div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              columnColor={color}
              onUpdate={onTaskUpdate}
              onDelete={onTaskUpdate}
              onEdit={onEditTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
