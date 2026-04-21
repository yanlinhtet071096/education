import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, LogOut, Menu, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthModal } from './AuthModal';

export function Navbar() {
  const { user, signOut, isInstructor } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <nav className="glass-panel sticky top-4 z-50 mx-4 mt-4 rounded-2xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">LearningX</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-slate-400 hover:text-white font-medium transition-colors text-sm uppercase tracking-wider">Courses</Link>
            {user ? (
              <>
                <Link to="/dashboard/student" className="text-slate-400 hover:text-white font-medium transition-colors text-sm font-bold uppercase tracking-wider">My Learning</Link>
                {isInstructor && (
                  <Link to="/dashboard/instructor" className="text-slate-400 hover:text-white font-medium transition-colors text-sm font-bold uppercase tracking-wider">Teach</Link>
                )}
                <div className="flex items-center space-x-4 pl-4 border-l border-white/10">
                  <div className="flex items-center space-x-2 group cursor-pointer">
                    <div className="w-9 h-9 rounded-lg glass-card flex items-center justify-center text-indigo-400 font-bold overflow-hidden shadow-sm group-hover:bg-indigo-500/20 transition-colors">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-white max-w-[120px] truncate">{user.email?.split('@')[0]}</span>
                  </div>
                  <button 
                    onClick={() => signOut()}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-slate-300 font-bold px-4 py-2 hover:text-white transition-colors text-sm"
                >
                  Log in
                </button>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all text-sm"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-300" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-lg rounded-b-2xl"
            >
              <div className="flex flex-col p-4 space-y-4">
                <Link to="/" className="text-slate-400 font-bold text-sm px-2 py-1 uppercase tracking-wider">Courses</Link>
                {user ? (
                  <>
                    <Link to="/dashboard/student" className="text-slate-400 font-bold text-sm px-2 py-1 uppercase tracking-wider">My Learning</Link>
                    {isInstructor && (
                      <Link to="/dashboard/instructor" className="text-slate-400 font-bold text-sm px-2 py-1 uppercase tracking-wider">Teach</Link>
                    )}
                    <button onClick={() => signOut()} className="text-red-400 font-bold text-sm px-2 py-1 text-left uppercase tracking-wider">Log out</button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { setIsAuthModalOpen(true); setIsMenuOpen(false); }}
                      className="text-white font-bold text-left p-3 border border-white/10 rounded-xl glass-card text-center"
                    >
                      Log in
                    </button>
                    <button 
                      onClick={() => { setIsAuthModalOpen(true); setIsMenuOpen(false); }}
                      className="bg-indigo-600 text-white font-bold text-center p-3 rounded-xl shadow-lg"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
