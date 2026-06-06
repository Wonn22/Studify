import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';

interface Member {
  id: string;
  name: string;
  avatar: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  category: string;
  assignee_id: string | null;
}

interface TaskCardProps {
  task: Task;
  members: Member[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const TaskCard = ({ task, members, onUpdate, onDelete }: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = members.find((m) => m.id === task.assignee_id);

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onUpdate(task.id, { assignee_id: value || null });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        task.status === 'Done' ? 'opacity-80' : ''
      } ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
            task.status === 'Done'
              ? 'bg-slate-100 text-slate-500'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          {task.category || 'Task'}
        </span>

        <div className="flex items-center gap-1">
          {!isConfirmingDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirmingDelete(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Delete task"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirmingDelete(false);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSaveTitle}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-sm font-semibold outline-none placeholder:text-slate-400 text-[#001F3F] bg-transparent border-b border-[#001F3F] pb-1 mb-2"
        />
      ) : (
        <h4
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`font-bold text-sm text-[#001F3F] mb-3 leading-snug cursor-text hover:text-blue-700 transition-colors ${
            task.status === 'Done' ? 'line-through text-slate-500' : ''
          }`}
        >
          {task.title}
        </h4>
      )}

      <div className="flex items-center justify-between">
        <div className="relative" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <select
            value={task.assignee_id || ''}
            onChange={handleAssigneeChange}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {assignee ? (
            <img
              className="w-6 h-6 rounded-full bg-slate-200 object-cover border border-slate-100"
              src={assignee.avatar}
              alt={assignee.name}
              title={assignee.name}
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[14px] text-slate-400">
                person_add
              </span>
            </div>
          )}
        </div>

        <span className="material-symbols-outlined text-slate-300 text-sm">
          {task.status === 'Done' ? 'task_alt' : 'drag_indicator'}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
