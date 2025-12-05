import React, { useEffect } from 'react';
import { Bell, X, CheckCircle, Info } from 'lucide-react';
import { NotificationMsg } from '../types';

interface NotificationToastProps {
  notifications: NotificationMsg[];
  onClose: (id: number) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((note) => (
        <ToastItem key={note.id} note={note} onClose={onClose} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ note: NotificationMsg; onClose: (id: number) => void }> = ({ note, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(note.id);
    }, 5000); // Auto close after 5 seconds
    return () => clearTimeout(timer);
  }, [note.id, onClose]);

  const getStyles = () => {
    switch (note.type) {
      case 'alert':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (note.type) {
      case 'alert': return <Bell className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className={`flex items-start p-4 rounded-lg border shadow-lg w-80 animate-fade-in-down ${getStyles()}`}>
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-sm">{note.title}</h3>
        <p className="text-sm mt-1 opacity-90">{note.message}</p>
      </div>
      <button onClick={() => onClose(note.id)} className="ml-2 text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationToast;