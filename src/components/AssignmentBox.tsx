import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Trash2, Edit2, Download, X, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  file_url: string;
  due_date: string;
  created_at: string;
}

interface AssignmentBoxProps {
  courseId: string;
  isInstructor: boolean;
}

export function AssignmentBox({ courseId, isInstructor }: AssignmentBoxProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [courseId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setTitle(assignment.title);
      setDescription(assignment.description || '');
      setDueDate(assignment.due_date ? new Date(assignment.due_date).toISOString().split('T')[0] : '');
    } else {
      setEditingAssignment(null);
      setTitle('');
      setDescription('');
      setDueDate('');
    }
    setFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      let fileUrl = editingAssignment?.file_url || '';

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `assignments/${courseId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-assets')
          .getPublicUrl(filePath);
        
        fileUrl = publicUrl;
      }

      const assignmentData = {
        course_id: courseId,
        title,
        description,
        file_url: fileUrl,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', editingAssignment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert(assignmentData);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchAssignments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAssignments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Assignments</h2>
        {isInstructor && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <div key={assignment.id} className="glass-panel rounded-3xl p-6 border border-white/5 hover:bg-white/5 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/20">
                    <FileText className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white uppercase tracking-tight text-lg">{assignment.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">{assignment.description}</p>
                    
                    {assignment.due_date && (
                      <div className="flex items-center space-x-2 mt-3 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {assignment.file_url && (
                    <a
                      href={assignment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-xl transition-all"
                      title="Download Assignment"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {isInstructor && (
                    <>
                      <button
                        onClick={() => handleOpenModal(assignment)}
                        className="p-2 bg-white/5 hover:bg-amber-600 text-slate-400 hover:text-white rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="p-2 bg-white/5 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center glass-panel rounded-3xl border border-dashed border-white/10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No assignments listed yet</p>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass-panel rounded-[2.5rem] p-8 shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Assignment details and resources</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                    placeholder="e.g., Final Project Proposal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 resize-none"
                    placeholder="Provide details about the assignment..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">File (Optional)</label>
                    <div className="relative group">
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="assignment-file"
                      />
                      <label 
                        htmlFor="assignment-file"
                        className="w-full bg-white/5 border border-white/10 hover:border-indigo-500/50 rounded-2xl px-5 py-4 text-slate-400 font-bold text-xs flex items-center justify-center cursor-pointer transition-all group-hover:bg-white/10"
                      >
                        {file ? file.name : editingAssignment?.file_url ? 'Change File' : 'Upload File'}
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-3 uppercase tracking-widest text-xs transition-all"
                >
                  {formLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{editingAssignment ? 'Update Assignment' : 'Create Assignment'}</span>
                      <Plus className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
