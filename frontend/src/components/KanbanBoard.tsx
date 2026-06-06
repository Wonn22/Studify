import { useEffect, useState } from 'react';
import { supabase } from '../database/database';
import { getCurrentSessionUser, isGroupMember } from '../security/dataAccess';

const KanbanBoard = ({ groupId }: { groupId?: string }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAddingColumn, setIsAddingColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const fetchTasks = async (targetGroupId = groupId) => {
    if (!targetGroupId) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', targetGroupId);
    
    if (error) {
        console.error("Supabase error:", error);
        setErrorMsg(error.message);
    }
    if (data) setTasks(data);
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
      } else {
        setTasks([]);
        setErrorMsg('You must be a group member to view board tasks.');
      }

      setCheckingAccess(false);
    };

    initializeBoard();
  }, [groupId]);

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
            category: 'Task'
        })
        .select()
        .single();
        
    if (error) {
        console.error("Error inserting task:", error);
    } else if (data) {
        setTasks(prev => [...prev, data]);
    }
    
    setIsAddingColumn(null);
    setNewTaskTitle('');
  };

  const columns = [
    { title: 'To Do', status: 'To Do' },
    { title: 'In Progress', status: 'In Progress' },
    { title: 'Done', status: 'Done' }
  ];

  return (
    <div className="mt-8">
      {checkingAccess && (
        <div className="bg-slate-50 text-slate-500 p-4 rounded-lg mb-4 text-sm font-bold border border-slate-200">
          Checking board access...
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4 text-sm font-bold border border-red-200">
          Database Error: {errorMsg} (Did you forget to add the RLS Policy?)
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {columns.map(col => (
        <div key={col.status} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
              {col.title} 
              <span className={`px-2 py-0.5 rounded text-xs ${col.status === 'In Progress' ? 'bg-[#001F3F] text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {tasks.filter(t => t.status === col.status).length}
              </span>
            </h3>
            <span 
                onClick={() => { setIsAddingColumn(col.status); setNewTaskTitle(''); }}
                className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-[#001F3F] transition-colors"
            >
                add
            </span>
          </div>

          <div className="space-y-4">
            {isAddingColumn === col.status && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Task title..."
                        className="w-full text-sm font-semibold outline-none placeholder:text-slate-400 text-[#001F3F]"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTask(col.status);
                            if (e.key === 'Escape') {
                                setIsAddingColumn(null);
                                setNewTaskTitle('');
                            }
                        }}
                        onBlur={() => handleAddTask(col.status)}
                    />
                </div>
            )}
            
            {tasks.filter(t => t.status === col.status).length === 0 && isAddingColumn !== col.status ? (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-sm font-medium">
                    No tasks
                </div>
            ) : (
                tasks.filter(t => t.status === col.status).map(task => (
                    <TaskCard key={task.id} task={task} />
                ))
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

const TaskCard = ({ task }: { task: any }) => (
  <div className={`bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${task.status === 'Done' ? 'opacity-80' : ''}`}>
    <span className={`inline-block text-[0.65rem] font-bold px-2 py-1 rounded mb-3 uppercase tracking-wider ${task.status === 'Done' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
      {task.category || 'Task'}
    </span>
    <h4 className={`font-bold text-[#001F3F] mb-4 leading-snug ${task.status === 'Done' ? 'line-through text-slate-500' : ''}`}>
      {task.title}
    </h4>
    <div className="flex items-center justify-between">
      <img className="w-6 h-6 rounded-full bg-slate-200" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.id}`} alt="assignee" />
      <span className="material-symbols-outlined text-slate-300 text-sm">
        {task.status === 'Done' ? 'task_alt' : 'attach_file'}
      </span>
    </div>
  </div>
);

export default KanbanBoard;
