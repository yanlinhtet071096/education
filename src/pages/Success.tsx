import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Success() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 relative z-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className="glass-panel p-8 rounded-[2.5rem] mb-10 shadow-2xl relative"
      >
        <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full" />
        <CheckCircle className="w-20 h-20 text-emerald-400 relative z-10" />
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-black text-white mb-6 uppercase tracking-tighter"
      >
        Enrollment <span className="text-emerald-400">Successful!</span>
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-slate-400 text-lg max-w-lg mb-12 font-medium leading-relaxed"
      >
        Your digital journey begins now. We've added the course to your learning library. Get ready to master new skills.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center justify-center gap-6"
      >
        <Link 
          to="/dashboard/student" 
          className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center space-x-3"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Go to Library</span>
        </Link>
        <Link 
          to="/" 
          className="glass-panel text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/10 transition-all flex items-center space-x-2"
        >
          <span>Browse More</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}
