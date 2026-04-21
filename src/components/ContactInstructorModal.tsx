import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { X, Send, Shield, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContactInstructorModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorId: string;
  instructorName: string;
  courseId: string;
}

export function ContactInstructorModal({ isOpen, onClose, instructorId, instructorName, courseId }: ContactInstructorModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message.trim()) return;

    setSending(true);
    setError(null);

    try {
      const { error: sendError } = await supabase
        .from('private_messages')
        .insert({
          sender_id: user.id,
          receiver_id: instructorId,
          course_id: courseId,
          content: message.trim()
        });

      if (sendError) throw sendError;

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setMessage('');
      }, 2000);
    } catch (err: any) {
      console.error('Error sending private message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#1e293b] w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 relative z-10"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Contact Instructor</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Private Message to {instructorName}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {sent ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                    <Send className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-black text-white uppercase tracking-tighter">Message Sent!</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">The instructor will get back to you soon.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Your Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask the instructor a private question..."
                      className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-sm focus:outline-none focus:border-indigo-500/50 min-h-[150px] transition-all resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Shield className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Secure & Private</span>
                    </div>
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-indigo-500/20"
                    >
                      {sending ? 'Sending...' : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
