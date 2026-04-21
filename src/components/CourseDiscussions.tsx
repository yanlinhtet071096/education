import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Trash2, Reply, Shield, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ContactInstructorModal } from './ContactInstructorModal';

interface Discussion {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

interface CourseDiscussionsProps {
  courseId: string;
  instructorId: string;
}

export function CourseDiscussions({ courseId, instructorId }: CourseDiscussionsProps) {
  const { user, profile } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInstructor = user?.id === instructorId;

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('course_discussions')
      .select('*, profiles(full_name, avatar_url, role)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching discussions:', fetchError);
      setError('Could not load discussions. Please try again later.');
    } else if (data) {
      setDiscussions(data as any);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    fetchDiscussions();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`course_discussions:${courseId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'course_discussions',
        filter: `course_id=eq.${courseId}`
      }, () => {
        fetchDiscussions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [courseId, fetchDiscussions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    setError(null);
    
    try {
      const { error: insertError } = await supabase
        .from('course_discussions')
        .insert({
          course_id: courseId,
          user_id: user.id,
          content: newComment,
          parent_id: replyTo
        });

      if (insertError) {
        throw insertError;
      }

      setNewComment('');
      setReplyTo(null);
    } catch (err: any) {
      console.error('Error posting comment:', err);
      setError(err.message || 'Failed to post comment. Make sure you are enrolled.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('course_discussions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting comment:', error.message);
    }
  };

  const CommentItem = ({ discussion, indent = false }: { discussion: Discussion, indent?: boolean }) => {
    const isInstructor = discussion.user_id === instructorId;
    const isOwner = user?.id === discussion.user_id;

    return (
      <div className={`group relative ${indent ? 'ml-8 mt-4 border-l-2 border-white/5 pl-4' : 'mb-6'}`}>
        <div className="flex space-x-4">
          <div className="flex-shrink-0">
            {discussion.profiles?.avatar_url ? (
              <img 
                src={discussion.profiles.avatar_url} 
                alt={discussion.profiles.full_name}
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-white/5">
                <span className="text-indigo-400 font-black text-xs">
                  {discussion.profiles?.full_name?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-grow space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                {discussion.profiles?.full_name}
              </span>
              {isInstructor && (
                <span className="flex items-center space-x-1 bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.2em] ring-1 ring-indigo-500/30">
                  <Shield className="w-2.5 h-2.5" />
                  <span>Instructor</span>
                </span>
              )}
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-tighter">
                {formatDistanceToNow(new Date(discussion.created_at))} ago
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {discussion.content}
            </p>
            
            <div className="flex items-center space-x-4 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setReplyTo(discussion.id);
                  // Scroll to form or show inline form
                }}
                className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
              {isOwner && (
                <button 
                  onClick={() => handleDelete(discussion.id)}
                  className="flex items-center space-x-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Render nested replies */}
        {discussions
          .filter(d => d.parent_id === discussion.id)
          .map(reply => (
            <CommentItem key={reply.id} discussion={reply} indent={true} />
          ))
        }
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-8 mb-8">
        <div>
          <h3 className="text-xl font-black text-white tracking-widest uppercase mb-1">
            Course Discussions
          </h3>
          <p className="text-slate-500 text-[10px] font-black leading-relaxed uppercase tracking-widest">
            Public forum for {courseId ? 'this course' : 'everyone'}.
          </p>
        </div>
        {!isInstructor && user && (
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600/10 hover:bg-indigo-600/20 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 transition-all border border-indigo-500/20 active:scale-95 group shadow-lg shadow-indigo-500/5"
          >
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Contact Instructor Privately</span>
          </button>
        )}
      </div>

      <ContactInstructorModal 
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        instructorId={instructorId}
        instructorName="Instructor"
        courseId={courseId}
      />

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center space-x-3"
        >
          <Shield className="w-5 h-5 text-rose-400" />
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider">{error}</p>
        </motion.div>
      )}

      {/* Discussion Feed */}
      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
        {loading && discussions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading discussions...</p>
          </div>
        ) : discussions.length === 0 ? (
          <div className="glass-panel p-12 rounded-[2.5rem] text-center space-y-4 border-white/5">
            <MessageSquare className="w-12 h-12 text-slate-700 mx-auto opacity-20" />
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest">No discussions yet</h4>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Be the first to start the conversation!</p>
            </div>
          </div>
        ) : (
          discussions
            .filter(d => !d.parent_id) // Only top-level
            .map(discussion => (
              <CommentItem key={discussion.id} discussion={discussion} />
            ))
        )}
      </div>

      {/* Post Form */}
      <div className="glass-panel p-6 rounded-[2rem] border-white/5 sticky bottom-0 bg-slate-900/80 backdrop-blur-xl">
        {!user ? (
          <div className="text-center py-4">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
              Sign in to join the discussion
            </p>
            <Link 
              to="/login" 
              className="text-indigo-400 text-[10px] font-black uppercase tracking-tighter hover:text-indigo-300 transition-colors"
            >
              Sign In →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative group">
            <AnimatePresence>
              {replyTo && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-between mb-4 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20"
                >
                  <div className="flex items-center space-x-2">
                    <Reply className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      Replying to: {discussions.find(d => d.id === replyTo)?.profiles.full_name}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-slate-500 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyTo ? "Write a reply..." : "Ask a question or share a thought..."}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-16 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all min-h-[100px] resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-110 active:scale-95 shadow-xl shadow-indigo-500/20"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
