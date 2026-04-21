import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { PlayCircle, Award, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            *,
            profiles(full_name)
          )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        setCourses(data.map(e => ({
          ...e.courses,
          enrollment_id: e.id,
          instructor: e.courses?.profiles?.full_name || 'LearningX Expert'
        })));
      }
      setLoading(false);
    };

    fetchEnrollments();
  }, [user]);
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <div className="bg-indigo-100/10 p-6 rounded-full">
          <BookOpen className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Sign in to track your learning journey</h2>
        <p className="text-slate-500 max-w-sm font-bold uppercase text-[10px] tracking-widest">Access your enrolled courses and pick up where you left off.</p>
        <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">Sign In</button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 relative z-10">
      <header>
        <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">My Learning</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
          {loading ? 'Crunching numbers...' : `You have ${courses.length} active courses.`}
        </p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-black text-[10px] uppercase tracking-widest">Fetching your progress...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-panel p-20 rounded-[3rem] text-center space-y-6">
           <div className="w-20 h-20 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4">
             <BookOpen className="w-8 h-8 text-indigo-400" />
           </div>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">No enrollments yet</h3>
           <p className="text-slate-500 max-w-sm mx-auto font-bold uppercase text-[10px] tracking-widest text-balance">Explore our catalog and start your learning journey tonight.</p>
           <Link to="/" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all inline-block">
             Browse Courses
           </Link>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group glass-panel rounded-3xl overflow-hidden shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col transform hover:-translate-y-2 border border-white/5"
            >
              <Link to={`/player/${course.id}`} className="relative aspect-video overflow-hidden block">
                <img 
                  src={course.thumbnail_url || 'https://picsum.photos/seed/course/400/225'} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 glass-panel rounded-full flex items-center justify-center shadow-lg">
                    <PlayCircle className="w-7 h-7 text-white fill-white" />
                  </div>
                </div>
                <div className="absolute top-4 right-4 glass-panel text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg border border-white/10">
                  In Progress
                </div>
              </Link>

              <div className="p-6 space-y-4 flex-grow flex flex-col">
                <div>
                  <h3 className="font-bold text-lg text-white line-clamp-1 mb-1 group-hover:text-indigo-400 transition-colors uppercase tracking-tight italic">{course.title}</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{course.instructor}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Course Progress</span>
                    <span className="text-indigo-400">10%</span>
                  </div>
                  <div className="h-1.5 glass-card rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '10%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    />
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border-l-4 border-indigo-500">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pick up where you left off</p>
                  <p className="text-sm font-bold text-slate-200 truncate truncate-tight">Course Introduction</p>
                </div>

                <div className="pt-4 mt-auto flex items-center justify-between border-t border-white/5">
                  <div className="flex items-center space-x-2 text-[10px] text-slate-600 font-black uppercase tracking-tighter">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Manage Learning</span>
                  </div>
                  <Link to={`/player/${course.id}`} className="text-indigo-400 font-black text-[10px] uppercase tracking-widest flex items-center space-x-1 hover:translate-x-1 transition-transform">
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {/* Recommended Section */}
      <section className="glass-panel rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center space-x-2 bg-indigo-600/30 border border-indigo-400/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            <Award className="w-3.5 h-3.5" />
            <span>Ready for your next challenge?</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tighter">Pick up a new skill <br/>for your career.</h2>
          <button className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-white/10">
            Browse All Courses
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      </section>
    </div>
  );
}
