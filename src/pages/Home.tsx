import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Star, Clock, Users, ChevronRight, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface Course {
  id: string;
  title: string;
  instructor_name?: string;
  price: number;
  thumbnail_url: string;
  rating?: number;
  students_count?: number;
  category?: string;
  categories?: { name: string };
  description: string;
  profiles?: { full_name: string };
}

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: 'Modern Web Development with React',
    instructor_name: 'Sarah Connor',
    price: 49.99,
    thumbnail_url: 'https://picsum.photos/seed/web/800/450',
    rating: 4.8,
    students_count: 1250,
    category: 'Development',
    description: 'Master React.js from scratch with hooks, context, and modern patterns.'
  },
  {
    id: '2',
    title: 'Machine Learning Fundamentals',
    instructor_name: 'Dr. Alan Smith',
    price: 89.99,
    thumbnail_url: 'https://picsum.photos/seed/ml/800/450',
    rating: 4.9,
    students_count: 840,
    category: 'Data Science',
    description: 'Deep dive into Python-based machine learning models and algorithms.'
  },
  {
    id: '3',
    title: 'UI/UX Design Masterclass',
    instructor_name: 'Elena Gilbert',
    price: 39.99,
    thumbnail_url: 'https://picsum.photos/seed/design/800/450',
    rating: 4.7,
    students_count: 2100,
    category: 'Design',
    description: 'Learn professional design principles and Figma workflow.'
  },
  {
    id: '4',
    title: 'Digital Marketing Excellence',
    instructor_name: 'Tom Hardy',
    price: 24.99,
    thumbnail_url: 'https://picsum.photos/seed/marketing/800/450',
    rating: 4.5,
    students_count: 5600,
    category: 'Business',
    description: 'Grow your business with SEO, SEM, and social media strategies.'
  }
];

export function Home() {
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt real database fetch if Supabase is configured
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*, categories(name), profiles(full_name)')
          .eq('status', 'published');
        
        if (!error && data && data.length > 0) {
          setCourses(data as any[]);
        }
      } catch (err) {
        console.log('Using mock data as database is not yet seeded');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden glass-panel rounded-3xl text-white p-8 md:p-16">
        <div className="relative z-10 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tighter"
          >
            Empower Your Future with <span className="text-indigo-400">LearningX</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-300 mb-8 max-w-xl"
          >
            Access world-class education from expert instructors. Start your journey today with thousands of courses available at your fingertips.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            <button className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-white/5">
              Explore Courses
            </button>
            <button className="glass-card text-white px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-all border-white/20">
              Become Instructor
            </button>
          </motion.div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[300px] h-[300px] bg-blue-500/10 blur-3xl rounded-full" />
      </section>

      {/* Course Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Featured Courses</h2>
          <div className="flex gap-2 text-indigo-400 font-bold cursor-pointer group text-sm uppercase tracking-widest">
            <span>View all</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link 
                to={`/course/${course.id}`} 
                className="group block glass-card rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 transform hover:-translate-y-2 border border-white/5"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={course.thumbnail_url || 'https://picsum.photos/seed/course/800/450'} 
                    alt={course.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute top-3 left-3 glass-panel text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/10">
                    {course.categories?.name || course.category || 'Course'}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-white line-clamp-2 min-h-[3rem] group-hover:text-indigo-400 transition-colors text-lg italic leading-tight">
                    {course.title}
                  </h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    By <span className="text-slate-300">{course.profiles?.full_name || course.instructor_name || 'Expert Instructor'}</span>
                  </p>
                  
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-slate-200">{course.rating || 0}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      ({(course.students_count || 0).toLocaleString()} students)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xl font-black text-white">${course.price}</span>
                    <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-lg opacity-x group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Platform Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 p-12 glass-panel rounded-3xl">
        <div className="flex items-start space-x-5">
          <div className="glass-card p-4 rounded-2xl text-indigo-400 shadow-inner ring-1 ring-white/5">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-1 uppercase text-xs tracking-widest">Lifetime Access</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Learn at your own pace with unlimited lifetime access.</p>
          </div>
        </div>
        <div className="flex items-start space-x-5">
          <div className="glass-card p-4 rounded-2xl text-teal-400 shadow-inner ring-1 ring-white/5">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-1 uppercase text-xs tracking-widest">Expert Instructors</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Learn from industry experts with real-world experience.</p>
          </div>
        </div>
        <div className="flex items-start space-x-5">
          <div className="glass-card p-4 rounded-2xl text-purple-400 shadow-inner ring-1 ring-white/5">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white mb-1 uppercase text-xs tracking-widest">Practical Learning</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Build projects and gain skills that matter in the job market.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
