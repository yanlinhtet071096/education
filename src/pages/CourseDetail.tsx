import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Play, Users, Star, Clock, Globe, Award, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      
      // Step 1: Fetch course and profiles
      const { data, error } = await supabase
        .from('courses')
        .select('*, categories(name), profiles(full_name)')
        .eq('id', id)
        .single();

      if (!error && data) {
        // Step 2: Fetch modules
        const { data: moduleData } = await supabase
          .from('modules')
          .select('*')
          .eq('course_id', id)
          .order('order', { ascending: true });

        let formattedModules = [];
        if (moduleData) {
          // Step 3: Fetch lessons for these modules
          const moduleIds = moduleData.map(m => m.id);
          if (moduleIds.length > 0) {
            const fetchLessonsWithFallback = async (cols: string): Promise<any> => {
              const { data, error } = await supabase
                .from('lessons')
                .select(cols)
                .in('module_id', moduleIds)
                .order('order', { ascending: true });
              
              if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
                if (cols.includes('attachment_url')) {
                  console.warn('Advanced columns missing, retrying with minimal set');
                  return await fetchLessonsWithFallback('id, module_id, title, content, order, is_free');
                }
              }
              return { data, error };
            };

            const { data: lessonData, error: lessonError } = await fetchLessonsWithFallback('id, module_id, title, video_url, attachment_url, attachment_type, content, order, is_free');

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

        const totalLessons = formattedModules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);

        setCourse({
          ...data,
          instructor: data.profiles?.full_name || 'Expert Instructor',
          category_name: data.categories?.name || 'Education',
          rating: 4.8, 
          reviews: 124, 
          students: 1250, 
          lastUpdated: new Date(data.updated_at).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }),
          language: 'English',
          outcomes: [
            'Master core concepts and practical applications',
            'Build real-world projects during the course',
            'Gain industry-relevant skills from scratch',
            'Access expert guidance and peer support',
            'Receive a verified completion certificate'
          ],
          modules: formattedModules,
          totalLessons
        });
      }
      setLoading(false);
    };

    if (id) fetchCourse();
  }, [id]);

  const handleEnroll = async () => {
    if (!user) {
      alert('Please sign in to enroll in this course');
      return;
    }

    setEnrolling(true);
    try {
      // In a real environment, this would call a Stripe checkout worker
      // For this demo, we'll simulate a success and redirect to dashboard
      const { error } = await supabase.from('enrollments').insert({
        user_id: user.id,
        course_id: id,
        status: 'active'
      });

      if (error) throw error;
      navigate('/dashboard/student');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading Catalog...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Course not found</h2>
        <Link to="/" className="text-indigo-400 font-bold hover:underline mt-4 inline-block">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-20 relative z-10">
      {/* Video Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl aspect-video glass-panel rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="absolute top-6 right-6 z-10 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              {course.promo_video_url ? (
                <video 
                  src={course.promo_video_url} 
                  autoPlay 
                  controls 
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest">
                  No preview available 
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Left Column: Content */}
      <div className="lg:col-span-2 space-y-12">
        <section className="space-y-6">
          <div className="flex gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
            <span>{course.category_name}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
            {course.title}
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed font-medium">
            {course.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-black text-white">{course.rating}</span>
              <span className="text-slate-500">({course.reviews} reviews)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-teal-400" />
              <span className="text-slate-300">{course.students} students</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span className="text-slate-300 font-bold tracking-tight">Created by <span className="text-white italic">{course.instructor}</span></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-t border-white/5 pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Last updated {course.lastUpdated}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <span>{course.language}</span>
            </div>
          </div>
        </section>

        {/* What you'll learn */}
        <section className="glass-panel rounded-3xl p-8 space-y-6 shadow-2xl">
          <h2 className="text-2xl font-black text-white tracking-tight">What you'll learn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {course.outcomes.map((outcome, i) => (
              <div key={i} className="flex items-start space-x-3 group">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-slate-300 text-sm leading-relaxed">{outcome}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Course Content */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white tracking-tight">Course content</h2>
            <div className="text-[10px] text-slate-500 font-black font-mono uppercase tracking-widest">
              {course.modules.length} modules • {course.totalLessons} lessons
            </div>
          </div>
          
          <div className="space-y-3">
            {course.modules.map((module, i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden hover:bg-white/5 transition-all">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-indigo-600/20 w-8 h-8 rounded-lg flex items-center justify-center font-black text-indigo-400 text-xs">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <span className="font-bold text-slate-200">{module.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold font-mono tracking-tighter uppercase">
                    {module.lessons?.length || 0} lessons
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column: Checkout Card */}
      <div className="relative">
        <div className="sticky top-24 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/40 relative group ring-1 ring-white/10"
          >
            <div 
              onClick={() => setIsPreviewOpen(true)}
              className="aspect-video relative overflow-hidden cursor-pointer"
            >
              <img 
                src={course.thumbnail_url || 'https://picsum.photos/seed/course/1200/600'} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                <div className="w-16 h-16 glass-panel rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-lg">
                Preview this course
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-black text-white tracking-tighter">${course.price}</span>
                <span className="text-lg text-slate-500 line-through font-bold">${(course.price * 2).toFixed(2)}</span>
                <span className="text-indigo-400 font-black text-xs uppercase tracking-widest">50% off</span>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {enrolling ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enroll Now</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button className="w-full glass-card text-white font-bold py-4 rounded-2xl hover:bg-white/10 transition-all border-white/5 uppercase tracking-widest text-xs">
                  Add to Cart
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
                30-Day Money-Back
              </div>

              <div className="pt-6 border-t border-white/5 space-y-5">
                <h4 className="font-black text-white text-[10px] uppercase tracking-widest">What's included:</h4>
                <ul className="space-y-4">
                  {[
                    { icon: Play, text: '8 hours on-demand video', color: 'text-indigo-400' },
                    { icon: Award, text: 'Completion Certificate', color: 'text-teal-400' },
                    { icon: Users, text: 'Q&A Community Access', color: 'text-purple-400' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center space-x-3 text-sm text-slate-400">
                      <div className={`p-1.5 glass-card rounded-lg ${item.color}`}>
                        <item.icon className="w-3 h-3" />
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
