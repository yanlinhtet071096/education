import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Plus, Layout, BarChart, Settings, Play, Edit, Trash, Loader2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CreateCourseModal } from '../components/CreateCourseModal';
import { EditCourseModal } from '../components/EditCourseModal';

export function InstructorDashboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*, categories(name)')
      .eq('instructor_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCourses(data);
    }
    setLoading(false);
  }, [user]);

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete);

    if (error) {
      alert('Error deleting course: ' + error.message);
    } else {
      setCourseToDelete(null);
      fetchCourses();
    }
    setLoading(false);
  };

  const handleDeleteClick = (id: string) => {
    setCourseToDelete(id);
  };

  const handleEdit = (course: any) => {
    setSelectedCourse(course);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="bg-indigo-100/10 p-6 rounded-full">
          <Settings className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tighter uppercase">Sign in to manage your studio</h2>
        <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">Sign In</button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 relative z-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Instructor Dashboard</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Manage your courses and see your impact {profile?.full_name && `(${profile.full_name})`}.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Course</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex items-center space-x-8 border-b border-white/5 overflow-x-auto px-4">
        {[
          { id: 'courses', label: 'My Courses', icon: Layout },
          { id: 'performance', label: 'Performance', icon: BarChart },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 pb-5 pt-1 px-1 font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap transition-all relative ${
              activeTab === tab.id 
                ? 'text-white' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-black text-[10px] uppercase tracking-widest">Loading Catalog...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="glass-panel p-20 rounded-[3rem] text-center space-y-6">
                 <div className="w-20 h-20 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4">
                   <Play className="w-8 h-8 text-indigo-400" />
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter">No courses found</h3>
                 <p className="text-slate-500 max-w-sm mx-auto font-bold uppercase text-[10px] tracking-widest text-balance">Create your first course to start sharing your expertise with the world.</p>
                 <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-white/5 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10"
                 >
                   Start Teaching
                 </button>
              </div>
            ) : (
              courses.map((course) => (
                <motion.div 
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-all group border border-white/5"
                >
                  <div className="flex items-center space-x-5">
                    <div className="w-32 h-20 rounded-2xl overflow-hidden flex-shrink-0 glass-panel relative group-hover:ring-2 ring-indigo-500/50 transition-all">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                           <Play className="w-6 h-6 text-indigo-400 opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest opacity-60">
                          {course.categories?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className={`font-black uppercase text-[9px] tracking-widest mb-2 px-2 py-0.5 rounded-full inline-block ${
                        course.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {course.status}
                      </h3>
                      <h4 className="font-bold text-xl text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                        {course.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-10 md:gap-14 px-4 md:px-0">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">Enrollments</p>
                      <p className="font-bold text-lg text-white font-mono leading-none">0</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">Earnings</p>
                      <p className="font-bold text-lg text-white font-mono leading-none">$0.00</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">Modules</p>
                      <p className="font-bold text-lg text-white font-mono leading-none">0</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {course.status !== 'published' && (
                      <button 
                        onClick={async () => {
                          const { error } = await supabase
                            .from('courses')
                            .update({ status: 'published' })
                            .eq('id', course.id);
                          if (!error) fetchCourses();
                        }}
                        className="flex items-center space-x-2 bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600/30 transition-all active:scale-95 border border-emerald-500/20"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Publish</span>
                      </button>
                    )}
                    <Link 
                      to={`/instructor/course/${course.id}/curriculum`}
                      className="p-3 text-indigo-400 hover:text-white glass-card rounded-2xl transition-all hover:bg-indigo-500/10 active:scale-95 border border-indigo-500/10"
                      title="Manage Curriculum"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleEdit(course)}
                      className="p-3 text-slate-400 hover:text-white glass-card rounded-2xl transition-all hover:bg-white/10 active:scale-95 border border-white/5"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(course.id)}
                      className="p-3 text-slate-400 hover:text-red-400 glass-card rounded-2xl transition-all hover:bg-red-500/10 active:scale-95 border border-white/5"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="glass-panel p-12 rounded-[3.5rem] shadow-2xl text-center space-y-6 border border-white/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BarChart className="w-64 h-64 text-white" />
            </div>
            <div className="w-24 h-24 glass-panel rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-white/10 relative z-10">
              <BarChart className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-widest relative z-10">Growth Insights</h3>
            <p className="text-slate-500 max-w-sm mx-auto font-bold uppercase text-[10px] tracking-widest text-balance relative z-10">We're aggregating your sales and engagement data. Detailed charts will appear once you have your first active students.</p>
          </div>
        )}
      </div>

      <CreateCourseModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchCourses}
      />

      <EditCourseModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchCourses}
        course={selectedCourse}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCourseToDelete(null)}
              className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass-panel rounded-[2rem] p-8 text-center space-y-6 border border-white/10"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Trash className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Are you sure?</h3>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                  This action cannot be undone. All modules and student data for this course will be deleted.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setCourseToDelete(null)}
                  className="flex-grow py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-grow bg-red-600 text-white font-black py-3 rounded-xl shadow-xl shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
