import React, { useState, useEffect } from 'react';
import { supabase } from '../database/database';
import {
    getProjectFilesStoragePath,
    getResourceFileType,
    getUploadValidationError,
    isGroupMember,
} from '../security/dataAccess';

const FilesView = ({ groupId }: { groupId?: string }) => {
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [canAccess, setCanAccess] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const initUser = async () => {
            setCheckingAccess(true);
            const { data: { user } } = await supabase.auth.getUser();
            const member = await isGroupMember(groupId, user?.id);

            setCurrentUser(user);
            setCanAccess(member);
            if (member) {
                await fetchFiles(groupId);
            } else {
                setFiles([]);
            }
            setCheckingAccess(false);
        };
        initUser();
    }, [groupId]);

    const fetchFiles = async (targetGroupId = groupId) => {
        if (!targetGroupId) return;

        const { data } = await supabase
            .from('resources')
            .select('*')
            .eq('group_id', targetGroupId)
            .order('created_at', { ascending: false });
        if (data) setFiles(data);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0 || !currentUser || !groupId || !canAccess) return;

            const file = event.target.files[0];
            const uploadValidationError = getUploadValidationError(file);
            if (uploadValidationError) throw new Error(uploadValidationError);

            const member = await isGroupMember(groupId, currentUser.id);
            if (!member) {
                setCanAccess(false);
                throw new Error('You must be a group member to upload files.');
            }

            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${groupId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('project-files')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase.from('resources').insert({
                group_id: groupId,
                uploaded_by: currentUser.id,
                file_name: file.name,
                file_url: publicUrl,
                file_type: getResourceFileType(file.name)
            });

            if (dbError) {
                await supabase.storage.from('project-files').remove([filePath]);
                throw dbError;
            }

            await fetchFiles(groupId);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleDeleteFile = async (file: any) => {
        if (!currentUser || !groupId || file.uploaded_by !== currentUser.id) return;

        const { error } = await supabase
            .from('resources')
            .delete()
            .eq('id', file.id)
            .eq('uploaded_by', currentUser.id)
            .eq('group_id', groupId);

        if (!error) {
            setFiles(prev => prev.filter(f => f.id !== file.id));
            setConfirmDeleteId(null);

            const storagePath = getProjectFilesStoragePath(file.file_url);
            if (storagePath) {
                await supabase.storage.from('project-files').remove([storagePath]);
            }
        }
    };

    if (!checkingAccess && !canAccess) {
        return (
            <div className="flex-1 flex items-center justify-center mt-4 bg-white border border-slate-200 rounded-2xl p-10">
                <p className="text-sm text-slate-400 font-medium">Join this group to view shared files.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-6 mt-4 overflow-hidden">
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-[#001F3F] transition-colors relative">
                <input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                <p className="text-slate-600 font-medium">
                    {uploading ? "Uploading Academic Asset..." : "Click or drag to upload research files"}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, or XLSX (Max 10MB)</p>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
                    <h3 className="font-bold text-[#001F3F]">Project Resources</h3>
                    <span className="text-xs font-bold text-slate-400">{files.length} Files</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {files.map((file) => {
                        const isConfirming = confirmDeleteId === file.id;
                        const canDelete = file.uploaded_by === currentUser?.id;
                        return (
                        <div key={file.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined">
                                            {file.file_type === 'pdf' ? 'picture_as_pdf' : file.file_type === 'xlsx' ? 'table_chart' : 'description'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#001F3F]">{file.file_name}</p>
                                        <p className="text-[0.65rem] text-slate-400">Added on {new Date(file.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={file.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 hover:bg-white rounded-full transition-shadow text-slate-400 hover:text-[#001F3F]"
                                        title="Download"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                    </a>
                                    {canDelete && !isConfirming && (
                                        <button
                                            onClick={() => setConfirmDeleteId(file.id)}
                                            title="Delete file"
                                            className="p-2 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            {canDelete && isConfirming && (
                                <div className="flex gap-2 pl-14">
                                    <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                    >Cancel</button>
                                    <button
                                        onClick={() => handleDeleteFile(file)}
                                        className="flex-1 text-xs font-bold py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >Delete File</button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                    {files.length === 0 && (
                        <p className="text-center py-20 text-slate-400 italic">No resources shared yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilesView;
