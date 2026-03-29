'use client';

import { useState, useEffect } from 'react';
import { Send, Phone, Video, Search, MoreVertical, Smile, Paperclip } from 'lucide-react';

interface Message {
  id: number;
  sender: 'user' | 'contact';
  text: string;
  time: string;
  read: boolean;
}

interface Contact {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  status: 'online' | 'offline' | 'typing';
}

interface WhatsAppChatProps {
  contactId?: number;
  onSendMessage?: (message: string, contactId: number) => void;
}

export default function WhatsAppChat({ contactId = 1, onSendMessage }: WhatsAppChatProps) {
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(contactId);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const contacts: Contact[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      phone: '+1 (555) 123-4567',
      avatar: '👩‍💼',
      lastMessage: 'Thanks for the update!',
      lastMessageTime: '2:30 PM',
      unread: 3,
      status: 'online',
    },
    {
      id: 2,
      name: 'Mike Davis',
      phone: '+1 (555) 234-5678',
      avatar: '👨‍💼',
      lastMessage: 'Are the documents ready?',
      lastMessageTime: '1:15 PM',
      unread: 0,
      status: 'online',
    },
    {
      id: 3,
      name: 'Emily Chen',
      phone: '+1 (555) 345-6789',
      avatar: '👩',
      lastMessage: 'Interested in our service',
      lastMessageTime: 'Yesterday',
      unread: 1,
      status: 'offline',
    },
    {
      id: 4,
      name: 'John Smith',
      phone: '+1 (555) 456-7890',
      avatar: '👨',
      lastMessage: 'Let me check and get back...',
      lastMessageTime: 'Mon',
      unread: 0,
      status: 'offline',
    },
  ];

  const messages: Message[] = [
    { id: 1, sender: 'contact', text: 'Hi! I wanted to follow up on the proposal', time: '10:00 AM', read: true },
    { id: 2, sender: 'contact', text: 'Have you had a chance to review it?', time: '10:15 AM', read: true },
    { id: 3, sender: 'user', text: 'Yes, I reviewed it. It looks great!', time: '10:45 AM', read: true },
    { id: 4, sender: 'contact', text: 'Thanks! Any questions?', time: '11:00 AM', read: true },
    { id: 5, sender: 'user', text: 'Just one - can we adjust the timeline?', time: '11:30 AM', read: true },
    { id: 6, sender: 'contact', text: 'Absolutely! What timeline works for you?', time: '11:45 AM', read: true },
    { id: 7, sender: 'user', text: 'Starting next month would be ideal', time: '12:00 PM', read: true },
    { id: 8, sender: 'contact', text: 'Perfect! I\'ll update the proposal and send it over', time: '12:15 PM', read: true },
    { id: 9, sender: 'contact', text: 'Thanks for the update!', time: '2:30 PM', read: false },
  ];

  const currentContact = contacts.find((c) => c.id === selectedContact);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage?.(message, selectedContact);
      setMessage('');
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  useEffect(() => {
    const chatDiv = document.getElementById('messages-container');
    if (chatDiv) {
      chatDiv.scrollTop = chatDiv.scrollHeight;
    }
  }, [messages]);

  const emojis = ['😊', '😂', '👍', '🎉', '💯', '❤️', '🔥', '✨'];

  return (
    <div className="flex h-full bg-slate-100 rounded-2xl overflow-hidden shadow-2xl">
      {/* Contacts Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200/50 flex flex-col hidden md:flex">
        {/* Search */}
        <div className="p-4 border-b border-slate-200/50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact.id)}
              className={`w-full px-4 py-3 border-b border-slate-200/30 text-left transition-colors ${
                selectedContact === contact.id ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl flex-shrink-0">
                  {contact.avatar}
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      contact.status === 'online' ? 'bg-green-500' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-slate-900 truncate">{contact.name}</p>
                    <p className="text-xs text-slate-500 flex-shrink-0">{contact.lastMessageTime}</p>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{contact.lastMessage}</p>
                </div>
                {contact.unread > 0 && (
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {contact.unread}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {currentContact && (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-200/50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-2xl">
                  {currentContact.avatar}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500`} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{currentContact.name}</p>
                  <p className="text-xs text-slate-500">
                    {currentContact.status === 'typing' ? 'typing...' : currentContact.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                  <Phone size={20} />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                  <Video size={20} />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              id="messages-container"
              className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gradient-to-b from-white to-slate-50"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-200 text-slate-900 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-600'}`}>
                      {msg.time}
                      {msg.sender === 'user' && msg.read && ' ✓✓'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="px-6 py-3 bg-slate-100 border-t border-slate-200/50 flex gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setMessage(message + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="w-8 h-8 text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-slate-200/50 bg-white flex items-end gap-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              >
                <Smile size={20} />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-slate-200/50 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
