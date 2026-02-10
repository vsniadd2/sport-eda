import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDateTimeLong } from '../../utils/formatDate';
import Loader from '../../components/Loader/Loader';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import styles from './Profile.module.css';
import feedbackStyles from './ProfileFeedback.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

export default function ProfileFeedback() {
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const { notify } = useNotifications();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyBody, setReplyBody] = useState({});
  const [replySubmitting, setReplySubmitting] = useState(null);
  const [closingTicketId, setClosingTicketId] = useState(null);
  const [confirmCloseTicketId, setConfirmCloseTicketId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchTickets = () => {
    if (!user) return;
    setLoading(true);
    setError('');
    authFetch(`${API_URL}/feedback`)
      .then((r) => {
        if (!r.ok) throw new Error('Не удалось загрузить обращения');
        return r.json();
      })
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    const socket = io(window.location.origin, { auth: { token } });
    socket.on('feedbackSupportReplied', ({ ticketId, message }) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, messages: [...(t.messages || []), message] } : t
        )
      );
    });
    return () => socket.disconnect();
  }, [user, notify]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bodyTrim = body.trim();
    if (!bodyTrim) {
      notify('Введите сообщение', 'error');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: bodyTrim }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка отправки');
      setBody('');
      notify('Обращение отправлено', 'success');
      fetchTickets();
      setExpandedId(data.id);
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId) => {
    const text = (replyBody[ticketId] || '').trim();
    if (!text) return;
    setReplySubmitting(ticketId);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/feedback/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка отправки');
      setReplyBody((prev) => ({ ...prev, [ticketId]: '' }));
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, messages: data.messages } : t)));
      notify('Сообщение отправлено', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setReplySubmitting(null);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    setConfirmCloseTicketId(null);
    setClosingTicketId(ticketId);
    setError('');
    try {
      const res = await authFetch(`${API_URL}/feedback/${ticketId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка');
      }
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (expandedId === ticketId) setExpandedId(null);
      setReplyBody((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      notify('Обращение закрыто', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setClosingTicketId(null);
    }
  };

  if (authLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <Loader wrap />
        </div>
      </main>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const firstMessagePreview = (ticket) => {
    const first = ticket.messages?.[0];
    if (!first?.body) return 'Без текста';
    return first.body.length > 80 ? first.body.slice(0, 80) + '…' : first.body;
  };

  const canReplyToTicket = (ticket) => {
    const messages = ticket.messages || [];
    const last = messages[messages.length - 1];
    return last?.author === 'admin';
  };

  const hasOpenTicket = tickets.length > 0;

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <Link to="/profile">Мой профиль</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <span>Обратная связь</span>
        </nav>
        <h1 className={styles.pageTitle}>Обратная связь</h1>

        <section className={feedbackStyles.feedbackFormBox}>
          <h2 className={feedbackStyles.feedbackFormTitle}>Написать в поддержку</h2>
          {hasOpenTicket && (
            <p className={feedbackStyles.feedbackFormHint}>
              У вас уже есть обращение. Дождитесь ответа поддержки или продолжите диалог в существующем тикете.
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <textarea
              className={feedbackStyles.feedbackTextarea}
              placeholder="Ваше сообщение..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={submitting || hasOpenTicket}
              maxLength={2000}
            />
            <button type="submit" className={feedbackStyles.feedbackSubmitBtn} disabled={submitting || hasOpenTicket}>
              {submitting ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        </section>

        {error && !hasOpenTicket && <div className={feedbackStyles.error}>{error}</div>}

        <h2 className={feedbackStyles.sectionTitle}>Мои обращения</h2>
        {loading ? (
          <Loader wrap />
        ) : tickets.length === 0 ? (
          <p className={feedbackStyles.emptyTickets}>У вас пока нет обращений. Напишите сообщение выше — мы ответим в личном кабинете.</p>
        ) : (
          <ul className={feedbackStyles.ticketList}>
            {tickets.map((ticket) => (
              <li key={ticket.id} className={feedbackStyles.ticketCard}>
                <button
                  type="button"
                  className={feedbackStyles.ticketSummary}
                  onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                >
                  <span className={feedbackStyles.ticketPreview}>{firstMessagePreview(ticket)}</span>
                  <span className={feedbackStyles.ticketDate}>
                    {ticket.created_at ? formatDateTimeLong(ticket.created_at) : ''}
                  </span>
                </button>
                {expandedId === ticket.id && (
                  <div className={feedbackStyles.ticketDetails}>
                    <ul className={feedbackStyles.messagesList}>
                      {ticket.messages?.map((msg) => (
                        <li
                          key={msg.id}
                          className={`${feedbackStyles.messageItem} ${msg.author === 'user' ? feedbackStyles.messageItemUser : feedbackStyles.messageItemAdmin}`}
                        >
                          <div className={feedbackStyles.messageMeta}>
                            {msg.author === 'user' ? 'Вы' : 'Поддержка'}
                            {msg.created_at && ` · ${formatDateTimeLong(msg.created_at)}`}
                          </div>
                          <div>{msg.body}</div>
                        </li>
                      ))}
                    </ul>
                    {canReplyToTicket(ticket) && (
                      <div className={feedbackStyles.replyForm}>
                        <textarea
                          className={feedbackStyles.feedbackTextarea}
                          placeholder="Ваш ответ..."
                          value={replyBody[ticket.id] || ''}
                          onChange={(e) => setReplyBody((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                          disabled={replySubmitting === ticket.id}
                          maxLength={2000}
                          rows={3}
                        />
                        <button
                          type="button"
                          className={feedbackStyles.feedbackSubmitBtn}
                          disabled={replySubmitting === ticket.id || !(replyBody[ticket.id] || '').trim()}
                          onClick={() => handleReply(ticket.id)}
                        >
                          {replySubmitting === ticket.id ? 'Отправка...' : 'Ответить'}
                        </button>
                      </div>
                    )}
                    <div className={feedbackStyles.ticketActions}>
                      <button
                        type="button"
                        className={feedbackStyles.closeTicketBtn}
                        disabled={closingTicketId === ticket.id}
                        onClick={() => setConfirmCloseTicketId(ticket.id)}
                      >
                        {closingTicketId === ticket.id ? 'Закрытие...' : 'Закрыть обращение'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmCloseTicketId != null}
        title="Закрыть обращение?"
        message="После закрытия создать новое можно в форме выше."
        confirmLabel="Закрыть"
        cancelLabel="Отмена"
        onConfirm={() => confirmCloseTicketId != null && handleCloseTicket(confirmCloseTicketId)}
        onCancel={() => setConfirmCloseTicketId(null)}
      />
    </main>
  );
}
