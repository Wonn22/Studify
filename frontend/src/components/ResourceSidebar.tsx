import React, { useEffect, useState } from 'react';
import { supabase } from '../database/database';

const ResourceSidebar = ({ groupId }: { groupId?: string }) => {
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
      const fetchResources = async () => {
          const { data } = await supabase
            .from('resources')
            .select('*')
            .eq('group_id', groupId);
          if (data) setResources(data);
      }
      if (groupId) fetchResources();
  }, [groupId]);

  return (
    <aside className="w-80 bg-slate-50 p-8 border-l border-slate-200 fixed right-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto hidden xl:block z-10">
      <h3 className="text-sm font-bold text-[#001F3F] uppercase tracking-[0.1em] mb-8 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg">database</span>
        Shared Resources
      </h3>
      
      <section>
        <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mb-4">Academic Assets</p>
        <ul className="space-y-4">
            {resources.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No resources shared yet.</p>
            ) : (
                resources.map(res => (
                    <ResourceItem 
                        key={res.id} 
                        name={res.file_name} 
                        type={res.file_type === 'pdf' ? 'picture_as_pdf' : 'description'} 
                        info="Shared file" 
                    />
                ))
            )}
        </ul>
      </section>
    </aside>
  );
};

const ResourceItem = ({ name, type, info }: any) => (
  <li className="group cursor-pointer">
    <div className="flex items-start gap-3">
      <span className="material-symbols-outlined text-[#001F3F] p-2 bg-white rounded border border-slate-200 shadow-sm group-hover:bg-[#001F3F] group-hover:text-white transition-colors">
        {type}
      </span>
      <div className="overflow-hidden">
        <p className="text-xs font-bold text-[#001F3F] truncate max-w-[180px]">{name}</p>
        <p className="text-[0.65rem] text-slate-500 mt-0.5">{info}</p>
      </div>
    </div>
  </li>
);

export default ResourceSidebar;
