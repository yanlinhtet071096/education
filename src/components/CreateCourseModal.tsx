import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Video, Type, FileText, Tag, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Category {
  id: string;
  name: string;
}

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState(1); // 1: Info, 2: Upload

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('id, name').order('name');
    if (!error && data) setCategories(data);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !profile) return;

    setLoading(true);
    try {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `videos/${profile.id}/${fileName}`;

      // 1. Upload Video
      const { error: uploadError, data } = await supabase.storage
        .from('course-assets')
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('course-assets')
        .getPublicUrl(filePath);

      // 2. Create Course in DB
      const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const { error: dbError } = await supabase.from('courses').insert({
        title,
        description,
        category_id: categoryId,
        instructor_id: profile.id,
        slug,
        promo_video_url: publicUrl,
        status: 'draft'
      });

      if (dbError) throw dbError;

      onSuccess();
      onClose();
      // Reset form
      setStep(1);
      setTitle('');
      setDescription('');
      setCategoryId('');
      setVideoFile(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl glass-panel rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                    Create New Course
                  </h2>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">
                    Step {step} of 2: {step === 1 ? 'General Information' : 'Course Video'}
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white glass-card rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleUpload} className="space-y-8">
                {step === 1 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course Title</label>
                        <div className="relative group">
                          <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                          <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Master React in 30 Days"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-600 font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Instructor Name</label>
                        <div className="relative group grayscale">
                          <input
                            disabled
                            value={profile?.full_name || 'Instructor'}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 outline-none text-sm text-slate-400 font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Category</label>
                       <div className="relative group">
                         <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
                         <select
                           required
                           value={categoryId}
                           onChange={(e) => setCategoryId(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white/10 transition-all text-sm text-white appearance-none cursor-pointer font-medium"
                         >
                           <option value="" className="bg-slate-900">Select a category</option>
                           {categories.map(cat => (
                             <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
                           ))}
                         </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Description</label>
                      <div className="relative group">
                        <FileText className="absolute left-4 top-6 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <textarea
                          required
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What will students learn in this course?"
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-4 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-600 font-medium resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Introduction Video</label>
                        <div className={`relative border-2 border-dashed rounded-[2rem] p-12 transition-all text-center group ${
                          videoFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="space-y-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all ${
                              videoFile ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500'
                            }`}>
                              {videoFile ? <CheckCircle className="w-8 h-8" /> : <Video className="w-8 h-8" />}
                            </div>
                            <div>
                               <p className="text-white font-bold">{videoFile ? videoFile.name : 'Upload promo video'}</p>
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">MP4, MOV up to 500MB</p>
                            </div>
                          </div>
                        </div>
                     </div>
                  </div>
                )}

                <div className="flex gap-4">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className="px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading || (step === 2 && !videoFile)}
                    className="flex-grow bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        {step === 1 ? <span>Next Step</span> : <span>Create Course</span>}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
