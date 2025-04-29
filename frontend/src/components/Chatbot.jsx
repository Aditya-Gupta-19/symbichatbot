import React, { useState, useRef, useEffect } from 'react';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';

const HealthcareBot = () => {
  const userId = "user123";
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { type: 'user', content: text }]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: text }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { type: 'bot', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { type: 'error', content: 'Error sending message.' }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Icon Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600"
        >
          <ChatBubbleIcon />
        </button>
      )}

      {/* Chatbox */}
      {isOpen && (
        <div className="w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
          <div className="bg-blue-500 p-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-white font-semibold">Healthcare Assistant</h2>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-blue-600 rounded-full p-1">
              <CloseIcon />
            </button>
          </div>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-2 rounded-lg ${msg.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && <CircularProgress size={24} className="m-auto" />}
          </div>
          <div className="border-t bg-white p-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(message)}
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none"
            />
            <button 
              onClick={() => handleSendMessage(message)} 
              disabled={!message.trim()} 
              className="bg-blue-500 text-white p-2 rounded-full"
            >
              <SendIcon />
            </button>
            <button onClick={() => fileInputRef.current.click()} className="p-2 rounded-full">
              <AttachFileIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthcareBot;
