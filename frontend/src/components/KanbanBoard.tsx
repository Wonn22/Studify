import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '../database/database';
import { getCurrentSessionUser, isGroupMember } from '../security/dataAccess';
import TaskCard from './TaskCard';

interface Task {
  id: string;
  title: string;
  status: string;
  category: string;
  assignee_id: string | null;
}

interface Member {
  id: string;
  name: string;
  avatar: string;
}

const columns = [
  { title: 'To Do', status: 'To Do' },
  { title: 'In Progress', status: 'In Progress' },
  { title: 'Done', status: 'Done' },
];

const KanbanBoard = ({ groupId }: { groupId?: string }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAddingColumn, setIsAddingColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const fetchTasks = async (targetGroupId = groupId) => {
    if (!targetGroupId) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', targetGroupId);

    if (error) {
      setErrorMsg(error.message);
    }
    if (data) setTasks(data as Task[]);
  };

  const fetchMembers = async (targetGroupId = groupId) => {
    if (!targetGroupId) return;
    const { data, error } = await supabase
      .from('group_participants')
      .select('profile_id, profiles(full_name, avatar_url)')
      .eq('group_id', targetGroupId);

    if (data) {
      setMembers(
        data.map((d: any) => ({
          id: d.profile_id,
          name: Array.isArray(d.profiles)
            ? d.profiles[0]?.full_name || 'Unknown'
            : (d.profiles as any)?.full_name || 'Unknown',
          avatar:
            (Array.isArray(d.profiles)
              ? d.profiles[0]?.avatar_url
              : (d.profiles as any)?.avatar_url) ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.profile_id}`,
        }))
      );
    } else if (error) {
      setErrorMsg('Unable to load members.');
    }
  };

  useEffect(() => {
    const initializeBoard = async () => {
      setCheckingAccess(true);
      setErrorMsg(null);

      const user = await getCurrentSessionUser();
      const member = await isGroupMember(groupId, user?.id);

      setCanAccess(member);
      if (member) {
        await fetchTasks(groupId);
        await fetchMembers(groupId);
      } else {
        setTasks([]);
        setErrorMsg('You must be a group member to view board tasks.');
      }

      setCheckingAccess(false);
    };

    initializeBoard();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !canAccess) return;

    const channel = supabase
      .channel(`tasks-group-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `group_id=eq.${groupId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => {
              if (prev.some(t => t.id === payload.new.id)) return prev;
              return [...prev, payload.new as Task];
            });
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev =>
              prev.map(t => (t.id === payload.new.id ? { ...t, ...(payload.new as Task) } : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, canAccess]);

  const handleAddTask = async (status: string) => {
    if (!newTaskTitle.trim() || !groupId || !canAccess) {
      setIsAddingColumn(null);
      setNewTaskTitle('');
      return;
    }

    const user = await getCurrentSessionUser();
    const member = await isGroupMember(groupId, user?.id);
    if (!member) {
      setCanAccess(false);
      setErrorMsg('You must be a group member to add tasks.');
      setIsAddingColumn(null);
      setNewTaskTitle('');
      return;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        group_id: groupId,
        title: newTaskTitle.trim(),
        status: status,
        category: 'Task',
      })
      .select()
      .single();

    if (error) {
      setErrorMsg(error.message);
    } else if (data) {
      setTasks((prev) => [...prev, data as Task]);
    }

    setIsAddingColumn(null);
    setNewTaskTitle('');
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    const previous = tasks.find((t) => t.id === id);
    if (!previous) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...previous } : t))
      );
      setErrorMsg(error.message);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const previous = tasks.find((t) => t.id === id);
    if (!previous) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      setTasks((prev) => [...prev, previous]);
      setErrorMsg(error.message);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overId = over.id as string;

    let targetStatus: string | null = null;

    const overColumn = columns.find((c) => c.status === overId);
    if (overColumn) {
      targetStatus = overColumn.status;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (!targetStatus) return;

    const activeTask = tasks.find((t) => t.id === activeIdStr);
    if (!activeTask || activeTask.status === targetStatus) return;

    const previousStatus = activeTask.status;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeIdStr ? { ...t, status: targetStatus } : t
      )
    );

    supabase
      .from('tasks')
      .update({ status: targetStatus })
      .eq('id', activeIdStr)
      .then(({ error }) => {
        if (error) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === activeIdStr ? { ...t, status: previousStatus } : t
            )
          );
          setErrorMsg(error.message);
        }
      });
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (checkingAccess) {
    return (
      <div className="bg-slate-50 text-slate-500 p-4 rounded-lg mb-4 text-sm font-bold border border-slate-200">
        Checking board access...
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4 text-sm font-bold border border-red-200">
        {errorMsg || 'You must be a group member to view board tasks.'}
      </div>
    );
  }

  return (
    <div className="mt-8">
      {errorMsg && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4 text-sm font-bold border border-red-200">
          {errorMsg}
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={tasks.filter((t) => t.status === col.status)}
              members={members}
              isAddingColumn={isAddingColumn}
              setIsAddingColumn={setIsAddingColumn}
              newTaskTitle={newTaskTitle}
              setNewTaskTitle={setNewTaskTitle}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="opacity-90 rotate-2 scale-105">
              <TaskCard
                task={activeTask}
                members={members}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

interface KanbanColumnProps {
  column: { title: string; status: string };
  tasks: Task[];
  members: Member[];
  isAddingColumn: string | null;
  setIsAddingColumn: (status: string | null) => void;
  newTaskTitle: string;
  setNewTaskTitle: (title: string) => void;
  onAddTask: (status: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

const KanbanColumn = ({
  column,
  tasks,
  members,
  isAddingColumn,
  setIsAddingColumn,
  newTaskTitle,
  setNewTaskTitle,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-4 rounded-xl p-2 transition-colors ${
        isOver ? 'bg-blue-50/60 ring-2 ring-blue-200/50' : ''
      }`}
    >
      <div className="flex items-center justify-between px-2">
        <h3 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
          {column.title}
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              column.status === 'In Progress'
                ? 'bg-[#001F3F] text-white'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {tasks.length}
          </span>
        </h3>
        <span
          onClick={() => {
            setIsAddingColumn(column.status);
            setNewTaskTitle('');
          }}
          className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-[#001F3F] transition-colors"
        >
          add
        </span>
      </div>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4 min-h-[80px]">
          {isAddingColumn === column.status && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <input
                autoFocus
                type="text"
                placeholder="Task title..."
                className="w-full text-sm font-semibold outline-none placeholder:text-slate-400 text-[#001F3F]"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddTask(column.status);
                  if (e.key === 'Escape') {
                    setIsAddingColumn(null);
                    setNewTaskTitle('');
                  }
                }}
                onBlur={() => onAddTask(column.status)}
              />
            </div>
          )}

          {tasks.length === 0 && isAddingColumn !== column.status ? (
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-sm font-medium">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                members={members}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanBoard;
