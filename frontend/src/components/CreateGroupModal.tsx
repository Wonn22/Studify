import { useState } from 'react';
import { supabase } from '../database/database';
import { useNavigate } from 'react-router-dom';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateGroupModal = ({ isOpen, onClose, onSuccess }: CreateGroupModalProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Active Research');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          status,
          deadline: deadline || null,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: partError } = await supabase
        .from('group_participants')
        .insert({
          group_id: newGroup.id,
          profile_id: user.id,
          role: 'Admin',
          joined_at: new Date().toISOString()
        });

      if (partError) throw partError;

      if (onSuccess) onSuccess();
      onClose();
      navigate(`/groups/${newGroup.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold font-headline text-primary">Initialize Group</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form id="create-group-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Group Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Distributed Systems Final"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001F3F]/20 focus:border-[#001F3F] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Description / Course Code
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. COMP6048"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001F3F]/20 focus:border-[#001F3F] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001F3F]/20 focus:border-[#001F3F] transition-all"
              >
                <option value="Active Research">Active Research</option>
                <option value="Completed">Completed</option>
                <option value="Paused">Paused</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Deadline (Optional)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#001F3F]/20 focus:border-[#001F3F] transition-all"
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-group-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#001F3F] text-white hover:bg-blue-950 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                Initializing...
              </>
            ) : (
              'Initialize Group'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
