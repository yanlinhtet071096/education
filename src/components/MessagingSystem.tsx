import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, User, ChevronRight, Inbox, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  course_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: {
    full_name: string;
    avatar_url: string;
  };
  course: {
    title: string;
  };
}

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export function MessagingSystem() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // This is a simplified way to fetch conversations using Supabase
    // Ideally we would have a dedicated conversations table or a more complex query
    const { data, error } = await supabase
      .from('private_messages')
      .select('*, sender:profiles!private_messages_sender_id_fkey(full_name, avatar_url), receiver:profiles!private_messages_receiver_id_fkey(full_name, avatar_url)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const convMap = new Map<string, Conversation>();
      
      data.forEach((msg: any) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const otherProfile = msg.sender_id === user.id ? msg.receiver : msg.sender;
        
        if (!convMap.has(otherId)) {
          convMap.set(otherId, {
            other_user_id: otherId,
            other_user_name: otherProfile?.full_name || 'Anonymous User',
            other_user_avatar: otherProfile?.avatar_url || '',
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: (!msg.is_read && msg.receiver_id === user.id) ? 1 : 0
          });
        } else {
          if (!msg.is_read && msg.receiver_id === user.id) {
            const existing = convMap.get(otherId)!;
            existing.unread_count += 1;
          }
        }
      });

      setConversations(Array.from(convMap.values()));
    }
    setLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async (otherId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('private_messages')
      .select('*, sender:profiles!private_messages_sender_id_fkey(full_name, avatar_url)')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as any);
      
      // Mark as read
      await supabase
        .from('private_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherId)
        .eq('is_read', false);
        
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    fetchConversations();
    
    const subscription = supabase
      .channel('private_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, () => {
        fetchConversations();
        if (selectedConversation) {
          fetchMessages(selectedConversation);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchConversations, selectedConversation, fetchMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    // Find the first message involving this person to get the course_id, 
    // or we might need to handle this differently. 
    // For now, I'll use a dummy/lookup if available or just the first course found.
    const firstMsg = messages.find(m => m.course_id);
    const courseId = firstMsg?.course_id;

    if (!courseId) {
        // Find a course involving these two actors if possible, or use a default if it's the first message
        // But in this flow, they should already have a conversation started.
    }

    const { error } = await supabase
      .from('private_messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedConversation,
        content: newMessage,
        course_id: courseId || '00000000-0000-0000-0000-000000000000' // Should be real
      });

    if (!error) {
      setNewMessage('');
      fetchMessages(selectedConversation);
    }
    setSending(false);
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading Mailbox...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      {/* Conversations List */}
      <div className="glass-panel rounded-3xl overflow-hidden flex flex-col border-white/5">
        <div className="p-6 border-b border-white/5 bg-white/5">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center space-x-2">
            <Inbox className="w-4 h-4 text-indigo-400" />
            <span>Conversations</span>
          </h3>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-12 text-center space-y-4 opacity-50">
              <MessageSquare className="w-12 h-12 mx-auto stroke-1" />
              <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.other_user_id}
                onClick={() => setSelectedConversation(conv.other_user_id)}
                className={`w-full p-6 flex items-start space-x-4 border-b border-white/5 transition-all text-left group ${
                  selectedConversation === conv.other_user_id 
                    ? 'bg-indigo-600/10' 
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  {conv.other_user_avatar ? (
                    <img src={conv.other_user_avatar} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-white/5">
                      <User className="w-6 h-6 text-indigo-400" />
                    </div>
                  )}
                  {conv.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-[#0f172a]">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider truncate">
                      {conv.other_user_name}
                    </h4>
                    <span className="text-[8px] font-bold text-slate-500 uppercase">
                      {formatDistanceToNow(new Date(conv.last_message_at))} ago
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate leading-relaxed">
                    {conv.last_message}
                  </p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-700 transition-transform ${
                   selectedConversation === conv.other_user_id ? 'translate-x-1 text-indigo-400' : 'group-hover:translate-x-1'
                }`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-2 glass-panel rounded-3xl overflow-hidden flex flex-col border-white/5 relative">
        <div className="absolute inset-0 mesh-bg opacity-10 pointer-events-none" />
        
        {selectedConversation ? (
          <>
            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-white/5">
                  <User className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">
                    {conversations.find(c => c.other_user_id === selectedConversation)?.other_user_name}
                  </h4>
                  <p className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-tighter flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Private Conversation</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
              {messages.map(msg => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] space-y-1 ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.sender_id === user?.id 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white/5 text-slate-300 border border-white/10 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center space-x-2 px-1 ${msg.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        {formatDistanceToNow(new Date(msg.created_at))} ago
                      </span>
                      {msg.sender_id === user?.id && (
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                          {msg.is_read ? 'Read' : 'Delivered'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div id="messages-bottom" />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 bg-white/5 border-t border-white/5 relative z-10">
              <div className="relative group">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-16 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 group-hover:scale-105"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center space-y-6 opacity-40 p-12 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center ring-8 ring-indigo-500/5">
              <MessageSquare className="w-10 h-10 text-indigo-400 stroke-1" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Your Inbox</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter max-w-xs mx-auto">
                Select a conversation from the sidebar to view your private messages.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
