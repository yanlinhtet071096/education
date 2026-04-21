import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Video, 
  FileText, 
  Image as ImageIcon, 
  GripVertical, 
  Loader2, 
  ArrowLeft,
  Settings,
  Save,
  CheckCircle,
  X,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  attachment_url: string | null;
  attachment_type: 'document' | 'image' | null;
  content: string | null;
  order: number;
  is_free: boolean;
}

export function CurriculumManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<{lesson: Lesson | null, moduleId: string} | null>(null);
  
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Protection: Ensure only the instructor can access this page
  useEffect(() => {
    if (user && profile && profile.role === 'student') {
      navigate('/dashboard/student');
    }
    if (course && user && course.instructor_id !== user.id) {
      navigate(`/course/${courseId}`); // Redirect students back to course detail
    }
  }, [course, user, profile, courseId, navigate]);

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    
    // Fetch course
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
    setCourse(courseData);

    // Fetch modules
    const { data: moduleData } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order', { ascending: true });
    
    if (moduleData) {
      setModules(moduleData);
      
      // Fetch lessons for all modules
      const moduleIds = moduleData.map(m => m.id);
      if (moduleIds.length > 0) {
        const fetchLessonsWithFallback = async (cols: string): Promise<any> => {
          const { data, error } = await supabase
            .from('lessons')
            .select(cols)
            .in('module_id', moduleIds)
            .order('order', { ascending: true });
          
          if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
            // If even a basic column like attachment_url is missing, try a very safe subset
            if (cols.includes('attachment_url')) {
              console.warn('attachment_url or other columns missing, retrying with strictly minimal columns');
              return await fetchLessonsWithFallback('id, module_id, title, content, order, is_free');
            }
          }
          return { data, error };
        };

        const { data: lessonData, error: lessonError } = await fetchLessonsWithFallback('id, module_id, title, video_url, attachment_url, attachment_type, content, order, is_free');
        
        if (lessonError) console.error('Lesson fetch error:', lessonError);
        
        if (lessonData) {
          const lessonMap: Record<string, Lesson[]> = {};
          lessonData.forEach((lesson: any) => {
            if (!lessonMap[lesson.module_id]) {
              lessonMap[lesson.module_id] = [];
            }
            lessonMap[lesson.module_id].push(lesson);
          });
          setLessons(lessonMap);
        }
      }
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'module' | 'lesson' | null>(null);

  const confirmDeleteAction = async () => {
    if (!deletingId || !deleteType) return;
    
    setLoading(true);
    try {
      if (deleteType === 'module') {
        // Safety: Manual delete lessons in case CASCADE is not active
        const { error: lessonError } = await supabase
          .from('lessons')
          .delete()
          .eq('module_id', deletingId);
        
        if (lessonError) console.warn('Lesson cleanup warning:', lessonError);

        const { error } = await supabase
          .from('modules')
          .delete()
          .eq('id', deletingId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lessons')
          .delete()
          .eq('id', deletingId);
          
        if (error) throw error;
      }
      
      setDeletingId(null);
      setDeleteType(null);
      fetchData();
    } catch (err: any) {
      console.error(`Delete ${deleteType} error:`, err);
      alert(`Could not delete ${deleteType}: ${err.message || 'Operation failed. Check your permissions.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = (id: string) => {
    setDeletingId(id);
    setDeleteType('module');
  };

  const handleDeleteLesson = (id: string) => {
    setDeletingId(id);
    setDeleteType('lesson');
  };

  if (loading && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Curriculum...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 relative z-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/dashboard/instructor')}
            className="flex items-center space-x-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Instructor Studio</span>
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Curriculum Builder</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Building Content for: <span className="text-indigo-400 italic">{course?.title}</span></p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingModule(null);
            setIsModuleModalOpen(true);
          }}
          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Module</span>
        </button>
      </header>

      <div className="space-y-6">
        {modules.length === 0 ? (
          <div className="glass-panel p-20 rounded-[3rem] text-center space-y-6 border border-white/5">
             <div className="w-20 h-20 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4">
               <Settings className="w-8 h-8 text-indigo-400" />
             </div>
             <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Your curriculum is empty</h3>
             <p className="text-slate-500 max-w-sm mx-auto font-bold uppercase text-[10px] tracking-widest text-balance">Add your first module to begin structuring your knowledge journey.</p>
          </div>
        ) : (
          modules.map((module, mIdx) => (
            <motion.div 
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-3xl overflow-hidden border border-white/5"
            >
              <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center text-xs font-black text-indigo-400">
                    {mIdx + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-none mb-1 uppercase">{module.title}</h3>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{lessons[module.id]?.length || 0} Lessons</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setEditingModule(module);
                      setIsModuleModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteModule(module.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  <div className="h-6 w-px bg-white/10 mx-2" />
                  <button 
                    onClick={() => {
                      setEditingLesson({ lesson: null, moduleId: module.id });
                      setIsLessonModalOpen(true);
                    }}
                    className="flex items-center space-x-2 bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Lesson</span>
                  </button>
                </div>
              </div>

              <div className="p-2 space-y-1">
                {lessons[module.id]?.map((lesson, lIdx) => (
                  <div 
                    key={lesson.id}
                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <GripVertical className="w-4 h-4 text-slate-700 group-hover:text-slate-500 cursor-move" />
                      <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">
                        {lIdx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-bold text-slate-200">{lesson.title}</h4>
                          <div className="flex items-center space-x-1">
                            {lesson.video_url && <Video className="w-3 h-3 text-indigo-400/50" />}
                            {lesson.attachment_type === 'document' && <FileText className="w-3 h-3 text-emerald-400/50" />}
                            {lesson.attachment_type === 'image' && <ImageIcon className="w-3 h-3 text-amber-400/50" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingLesson({ lesson, moduleId: module.id });
                          setIsLessonModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!lessons[module.id] || lessons[module.id].length === 0) && (
                  <div className="p-10 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] italic">
                    Push logic: No modules detected in this sector
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <ModuleModal 
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        onSuccess={fetchData}
        courseId={courseId!}
        editingModule={editingModule}
      />

      <LessonModal 
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        onSuccess={fetchData}
        moduleId={editingLesson?.moduleId || ''}
        editingLesson={editingLesson?.lesson || null}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setDeletingId(null); setDeleteType(null); }} 
              className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-2xl" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-md glass-panel rounded-[2rem] p-10 text-center space-y-8 border border-white/10 shadow-2xl shadow-black/50"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                <Trash className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Permanent Deletion</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Are you absolutely sure? This {deleteType} and all its associated data will be purged from the studio forever.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => { setDeletingId(null); setDeleteType(null); }}
                  className="flex-grow py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  Aborted
                </button>
                <button 
                  onClick={confirmDeleteAction}
                  disabled={loading}
                  className="flex-grow bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{loading ? 'Purging...' : 'Purge Data'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModuleModal({ isOpen, onClose, onSuccess, courseId, editingModule }: any) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(editingModule?.title || '');
    }
  }, [isOpen, editingModule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingModule) {
        const { error } = await supabase
          .from('modules')
          .update({ title })
          .eq('id', editingModule.id);
        if (error) throw error;
      } else {
        // Get max order
        const { data: existing } = await supabase
          .from('modules')
          .select('order')
          .eq('course_id', courseId)
          .order('order', { ascending: false })
          .limit(1);
        
        const order = existing && existing.length > 0 ? existing[0].order + 1 : 1;
        
        const { error } = await supabase
          .from('modules')
          .insert({ title, course_id: courseId, order });
        
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Module operation failed:', error);
      alert(`Failed to save module: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md glass-panel rounded-[2rem] p-8 space-y-6 border border-white/10">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">{editingModule ? 'Edit Module' : 'Create Module'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Module Title</label>
                <input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Getting Started"
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={onClose} className="flex-grow py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="flex-grow bg-indigo-600 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px]">
                   {loading ? 'Saving...' : 'Save Module'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function LessonModal({ isOpen, onClose, onSuccess, moduleId, editingLesson }: any) {
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<'document' | 'image' | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setTitle(editingLesson?.title || '');
      setAttachmentType(editingLesson?.attachment_type || null);
      setContent(editingLesson?.content || '');
      setVideoFile(null);
      setAttachmentFile(null);
    }
  }, [isOpen, editingLesson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      let videoUrl = editingLesson?.video_url || null;
      let attachmentUrl = editingLesson?.attachment_url || null;

      // Upload files first... (keeping existing upload logic)
      if (videoFile) {
        console.log('Attempting to upload video:', videoFile.name);
        const path = `lessons/${profile.id}/${Date.now()}_${videoFile.name}`;
        const { error: upErr } = await supabase.storage.from('course-assets').upload(path, videoFile);
        if (upErr) throw new Error(`Video upload failed: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from('course-assets').getPublicUrl(path);
        videoUrl = publicUrl;
      }

      if (attachmentFile) {
        console.log('Attempting to upload attachment:', attachmentFile.name);
        const path = `lessons/${profile.id}/attachments/${Date.now()}_${attachmentFile.name}`;
        const { error: upErr } = await supabase.storage.from('course-assets').upload(path, attachmentFile);
        if (upErr) throw new Error(`Attachment upload failed: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from('course-assets').getPublicUrl(path);
        attachmentUrl = publicUrl;
      }

      // Get order if adding new
      let payloadOrder = editingLesson?.order || 1;
      if (!editingLesson) {
        const { data: existing } = await supabase
          .from('lessons')
          .select('order')
          .eq('module_id', moduleId)
          .order('order', { ascending: false })
          .limit(1);
        payloadOrder = existing && existing.length > 0 ? existing[0].order + 1 : 1;
      }

      const saveLessonWithFallback = async (payload: any) => {
        const { error } = editingLesson 
          ? await supabase.from('lessons').update(payload).eq('id', editingLesson.id)
          : await supabase.from('lessons').insert(payload);
        
        if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
          // Identify which column might be missing from the error message
          const missingColumnMatch = error.message.match(/column "(.*?)"/);
          const missingColumn = missingColumnMatch ? missingColumnMatch[1] : null;
          
          if (missingColumn && payload[missingColumn] !== undefined) {
            console.warn(`Column "${missingColumn}" missing in database. Retrying without it.`);
            const newPayload = { ...payload };
            delete newPayload[missingColumn];
            return await saveLessonWithFallback(newPayload);
          }
          
          // If we can't identify the column but it's a schema error, try stripping all optional columns as a last resort
          if (error.code === 'PGRST204') {
            console.warn('Generic schema error. Retrying with minimal payload.');
            const minimalPayload = {
              title: payload.title,
              module_id: payload.module_id,
              order: payload.order,
              content: payload.content
            };
            const { error: retryError } = editingLesson 
              ? await supabase.from('lessons').update(minimalPayload).eq('id', editingLesson.id)
              : await supabase.from('lessons').insert(minimalPayload);
            return { error: retryError };
          }
        }
        return { error };
      };

      const initialPayload = {
        title,
        video_url: videoUrl,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        content,
        module_id: moduleId,
        order: payloadOrder
      };

      const { error: saveError } = await saveLessonWithFallback(initialPayload);

      if (saveError) throw saveError;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Curriculum error:', error);
      alert(error.message || 'An unexpected error occurred while saving the lesson.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl glass-panel rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto border border-white/10 custom-scrollbar">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-6">{editingLesson ? 'Edit Lesson' : 'Create Lesson'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lesson Title</label>
                <input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Setting up your environment"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Video Content (MP4)</label>
                  <div className="relative glass-card border border-white/5 p-4 rounded-xl text-center group cursor-pointer hover:bg-white/5 transition-all">
                    <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Video className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                    <span className="text-[10px] font-bold text-slate-400 truncate block">
                      {videoFile ? videoFile.name : 'Upload Video'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attachment Typology</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setAttachmentType(attachmentType === 'document' ? null : 'document')}
                      className={`p-2 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                        attachmentType === 'document' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase">Doc</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAttachmentType(attachmentType === 'image' ? null : 'image')}
                      className={`p-2 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                        attachmentType === 'image' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/10 text-slate-500'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase">Img</span>
                    </button>
                  </div>
                </div>
              </div>

              {attachmentType && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload {attachmentType === 'image' ? 'Image' : 'Document'}</label>
                  <div className="relative glass-card border border-white/5 p-4 rounded-xl text-center group cursor-pointer hover:bg-white/5 transition-all">
                    <input type="file" accept={attachmentType === 'image' ? "image/*" : ".pdf,.doc,.docx,.txt"} onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-2" />
                    <span className="text-[10px] font-bold text-slate-400 truncate block">
                      {attachmentFile ? attachmentFile.name : 'Choose File'}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lesson Notes (Markdown Supported)</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:ring-1 focus:ring-indigo-500 resize-none text-sm"
                  placeholder="Additional context, links, or code snippets..."
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button type="button" onClick={onClose} className="flex-grow py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="flex-grow bg-indigo-600 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2">
                   {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                   <span>{editingLesson ? 'Update Lesson' : 'Add Lesson'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
