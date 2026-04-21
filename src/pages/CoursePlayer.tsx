import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Play, 
  ClipboardList, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  MessageSquare, 
  Info, 
  Star, 
  Download, 
  ExternalLink,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import Markdown from 'react-markdown';
import { CourseDiscussions } from '../components/CourseDiscussions';

export function CoursePlayer() {
  const { courseId, lessonId } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      // Step 1: Fetch course with profiles
      const { data, error } = await supabase
        .from('courses')
        .select('*, profiles(full_name)')
        .eq('id', courseId)
        .single();

      if (!error && data) {
        // Step 2: Fetch modules
        const { data: moduleData } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('order', { ascending: true });

        let formattedModules = [];
        if (moduleData) {
          // Step 3: Fetch lessons
          const moduleIds = moduleData.map(m => m.id);
          if (moduleIds.length > 0) {
            const fetchLessonsData = async () => {
              const { data, error } = await supabase
                .from('lessons')
                .select('id, module_id, title, video_url, attachment_url, attachment_type, content, order, is_free')
                .in('module_id', moduleIds)
                .order('order', { ascending: true });
              
              if (error && (error.code === '42703' || error.message?.includes('column'))) {
                const { data: fallbackData } = await supabase
                  .from('lessons')
                  .select('id, module_id, title, content, order, is_free')
                  .in('module_id', moduleIds)
                  .order('order', { ascending: true });
                return fallbackData;
              }
              return data;
            };

            const lessonData = await fetchLessonsData();

            if (lessonData) {
              formattedModules = moduleData.map(m => ({
                ...m,
                lessons: lessonData.filter((l: any) => l.module_id === m.id)
              }));
            } else {
              formattedModules = moduleData.map(m => ({ ...m, lessons: [] }));
            }
          } else {
            formattedModules = moduleData.map(m => ({ ...m, lessons: [] }));
          }
        }

        setCourse({ 
          ...data, 
          instructor_name: data.profiles?.full_name || 'Expert Instructor',
          modules: formattedModules 
        });

        // Set current lesson
        const allLessons = formattedModules.flatMap(m => m.lessons);
        if (lessonId) {
          const lesson = allLessons.find((l: any) => l.id === lessonId);
          if (lesson) setCurrentLesson(lesson);
        } else if (allLessons.length > 0) {
          setCurrentLesson(allLessons[0]);
        } else {
          // Fallback to promo video if no lessons
          setCurrentLesson({
            title: 'Welcome to the Course',
            video_url: data.promo_video_url,
            content: data.description,
            is_promo: true
          });
        }
      }
      setLoading(false);
    };

    if (courseId) fetchCourseData();
  }, [courseId, lessonId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Preparing your classroom...</h2>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Course not found</h2>
        <Link to="/dashboard/student" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Return to Dashboard</Link>
      </div>
    );
  }

  const isIframeVideo = (url: string) => {
    return url?.includes('youtube.com') || url?.includes('vimeo.com') || url?.includes('embed');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0f172a] flex flex-col md:flex-row h-screen">
      {/* Sidebar (Curriculum) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-slate-900/40 backdrop-blur-3xl border-r border-white/10 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-black text-white text-[10px] uppercase tracking-[0.2em]">Course Content</h2>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-slate-500 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {course.modules.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                  No modules added to this course yet.
                </div>
              ) : (
                course.modules.map((module: any, mIndex: number) => (
                  <div key={mIndex} className="border-b border-white/5 last:border-0">
                    <div className="bg-white/5 px-4 py-3 flex items-center justify-between">
                      <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">{module.title}</span>
                    </div>
                    <div className="py-2">
                      {module.lessons?.map((lesson: any) => (
                        <Link
                          key={lesson.id}
                          to={`/player/${courseId}/${lesson.id}`}
                          className={`flex items-center justify-between px-4 py-3 group hover:bg-white/5 transition-colors ${
                            lessonId === lesson.id || currentLesson?.id === lesson.id ? 'glass-card border-indigo-500/30 bg-indigo-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-1 rounded-full ${lessonId === lesson.id || currentLesson?.id === lesson.id ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                              <Play className="w-4 h-4 fill-current" />
                            </div>
                            <span className={`text-[11px] font-bold ${lessonId === lesson.id || currentLesson?.id === lesson.id ? 'text-white' : 'text-slate-500 uppercase tracking-widest'}`}>
                              {lesson.title}
                            </span>
                          </div>
                          {lesson.duration && (
                             <span className="text-[10px] text-slate-600 font-bold font-mono uppercase tracking-tighter">{lesson.duration}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content (Player) */}
      <div className="flex-grow flex flex-col min-w-0 bg-[#0f172a] relative">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" />
        <header className="glass-panel h-16 border-b border-white/5 flex items-center justify-between px-4 text-white relative z-10">
          <div className="flex items-center space-x-4 overflow-hidden">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 glass-card rounded-lg hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-indigo-400" />
              </button>
            )}
            <div className="flex flex-col min-w-0">
              <Link to="/dashboard/student" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors flex items-center space-x-1">
                <ChevronLeft className="w-3 h-3" />
                <span>Exit Player</span>
              </Link>
              <h1 className="font-bold text-sm md:text-base leading-tight truncate uppercase tracking-tighter">{course.title}</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-3">
             <button className="bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">Previous</button>
             <button className="bg-indigo-600 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all flex items-center space-x-1 ring-4 ring-indigo-500/10">
               <span>Next</span>
               <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto relative z-10">
          {/* Video Player Area */}
          <div className="max-w-6xl mx-auto w-full p-6">
            <div className="aspect-video bg-black shadow-2xl relative rounded-3xl overflow-hidden ring-1 ring-white/10">
               {currentLesson?.video_url ? (
                 isIframeVideo(currentLesson.video_url) ? (
                   <iframe 
                    src={currentLesson.video_url}
                    className="w-full h-full opacity-90"
                    title={currentLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                 ) : (
                   <video 
                     src={currentLesson.video_url}
                     className="w-full h-full opacity-90"
                     controls
                     autoPlay
                   />
                 )
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                    <Play className="w-16 h-16 opacity-10" />
                    <p className="font-black text-[10px] uppercase tracking-widest">No video content for this lesson</p>
                 </div>
               )}
               <div className="absolute bottom-6 left-6 p-3 glass-panel rounded-xl">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">In Progress</p>
                  <h4 className="font-bold text-white text-xs">{currentLesson?.title}</h4>
               </div>
            </div>

            {/* Content Tabs */}
            <div className="p-6 md:p-12 text-slate-300 space-y-8">
              <div className="flex items-center space-x-8 border-b border-white/5">
                {[
                  { id: 'overview', label: 'Overview', icon: Info },
                  { id: 'notes', label: 'Notes', icon: ClipboardList },
                  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 pb-5 pt-1 px-1 font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-all relative ${
                      activeTab === tab.id 
                        ? 'text-white' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activePlayerTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,1)]"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-4 max-w-3xl">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-white leading-tight tracking-tighter uppercase">{currentLesson?.title}</h2>
                    <p className="text-slate-400 leading-relaxed font-medium text-lg italic">{currentLesson?.description || course.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                       <div className="glass-card p-6 rounded-3xl">
                         <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em] text-indigo-400 mb-2 leading-none">Instructor</h3>
                         <p className="text-xl font-black text-white tracking-tighter uppercase">{course.instructor_name || 'LearningX Expert'}</p>
                       </div>
                       <div className="glass-card p-6 rounded-3xl">
                         <h3 className="font-black text-white text-[10px] uppercase tracking-[0.3em] text-indigo-400 mb-2 leading-none">Current Section</h3>
                         <p className="text-xl font-black text-white tracking-tighter uppercase line-clamp-1">{course.modules.find((m: any) => m.lessons?.some((l: any) => l.id === currentLesson?.id))?.title || 'Course Intro'}</p>
                       </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'notes' && (
                  <div className="space-y-8">
                    {currentLesson?.attachment_url && (
                      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 transition-all hover:bg-indigo-500/10 mb-8">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center">
                              {(currentLesson.attachment_type === 'image' || 
                                (currentLesson.attachment_url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(currentLesson.attachment_url))) ? (
                                <ImageIcon className="w-6 h-6 text-indigo-400" />
                              ) : (
                                <FileText className="w-6 h-6 text-emerald-400" />
                              )}
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Lesson Resource</p>
                               <h4 className="font-bold text-white uppercase tracking-tight">
                                 {(currentLesson.attachment_type === 'image' || 
                                   (currentLesson.attachment_url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(currentLesson.attachment_url))) 
                                   ? 'Reference Image' : 'Downloadable Document'}
                               </h4>
                            </div>
                          </div>
                          <a 
                            href={currentLesson.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all text-slate-300 hover:text-white"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        </div>
                        {(currentLesson.attachment_type === 'image' || 
                          (currentLesson.attachment_url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(currentLesson.attachment_url))) && (
                          <div className="mt-4 rounded-xl overflow-hidden glass-card border border-white/5">
                             <img src={currentLesson.attachment_url} className="w-full h-auto opacity-80" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    )}

                    {currentLesson?.content ? (
                      <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-pink-500/50" />
                        <div className="markdown-body">
                          <Markdown>{currentLesson.content}</Markdown>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel p-12 rounded-[2.5rem] text-center space-y-6 shadow-2xl relative overflow-hidden group border-white/5">
                        <div className="glass-card w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform">
                          <ClipboardList className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white tracking-widest uppercase mb-1">No notes yet</h3>
                          <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed font-medium">Personal notes help you cement concepts. Tap below to start capturing yours.</p>
                        </div>
                        <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20">Add Note</button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'discussions' && (
                  <CourseDiscussions courseId={courseId!} instructorId={course.instructor_id} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
