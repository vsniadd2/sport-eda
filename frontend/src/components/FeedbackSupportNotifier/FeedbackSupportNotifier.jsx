import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

const TOKEN_KEY = 'sport-eda-token';

export default function FeedbackSupportNotifier() {
  const { user } = useAuth();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    const socket = io(window.location.origin, { auth: { token } });
    socket.on('feedbackSupportReplied', () => {
      notify('Поддержка ответила', 'success');
    });
    return () => socket.disconnect();
  }, [user, notify]);

  return null;
}
