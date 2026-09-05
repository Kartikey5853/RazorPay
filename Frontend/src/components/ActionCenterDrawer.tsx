import React, { useState } from 'react';
import { ActionCenterService, type PendingAction } from '../services/api';

interface ActionCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actions: PendingAction[];
  onActionHandled: () => void;
}

export const ActionCenterDrawer: React.FC<ActionCenterDrawerProps> = ({
  isOpen,
  onClose,
  actions,
  onActionHandled
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'email' | 'reminder' | 'task' | 'payment_reminder' | 'follow_up'>('all');
  const [editingAction, setEditingAction] = useState<PendingAction | null>(null);
  const [reviewEmailAction, setReviewEmailAction] = useState<PendingAction | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [editForm, setEditForm] = useState({ title: '', date: '', time: '', due_date: '', description: '' });

  if (!isOpen) return null;

  const filtered = activeTab === 'all' 
    ? actions 
    : actions.filter(a => a.type === activeTab || (activeTab === 'reminder' && a.type === 'payment_reminder'));

  const handleConfirm = async (action: PendingAction, overrides?: any) => {
    setIsProcessing(action.id);
    try {
      await ActionCenterService.confirm(action.id, overrides);
      onActionHandled();
      if (reviewEmailAction?.id === action.id) setReviewEmailAction(null);
      if (editingAction?.id === action.id) setEditingAction(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to confirm action');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDismiss = async (action: PendingAction) => {
    setIsProcessing(action.id);
    try {
      await ActionCenterService.dismiss(action.id);
      onActionHandled();
      if (editingAction?.id === action.id) setEditingAction(null);
      if (reviewEmailAction?.id === action.id) setReviewEmailAction(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || 'Failed to dismiss action');
    } finally {
      setIsProcessing(null);
    }
  };

  const openEmailReview = (action: PendingAction) => {
    const p = action.payload || {};
    setEmailForm({
      to: p.email || '',
      subject: p.subject || action.title,
      body: p.body || action.description || ''
    });
    setReviewEmailAction(action);
  };

  const openEdit = (action: PendingAction) => {
    const p = action.payload || {};
    setEditForm({
      title: action.title,
      date: p.date || '',
      time: p.time || '',
      due_date: p.due_date || '',
      description: action.description || ''
    });
    setEditingAction(action);
  };

  const saveAndConfirmEdit = async () => {
    if (!editingAction) return;
    const overrides: any = {
      title: editForm.title,
      description: editForm.description,
      date: editForm.date,
      time: editForm.time,
      due_date: editForm.due_date
    };
    await handleConfirm(editingAction, overrides);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return { icon: 'mail', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
      case 'reminder': return { icon: 'calendar_today', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
      case 'task': return { icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'payment_reminder': return { icon: 'payments', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
      default: return { icon: 'forward_to_inbox', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-slide-in-right">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">inbox</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                Marcus Action Center
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-secondary text-white">
                  {actions.length} Pending
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">Review and confirm suggestions extracted from completed calls.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-100 px-5 bg-white text-xs font-semibold gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: actions.length },
            { id: 'email', label: 'Emails', count: actions.filter(a => a.type === 'email').length },
            { id: 'reminder', label: 'Reminders', count: actions.filter(a => a.type === 'reminder' || a.type === 'payment_reminder').length },
            { id: 'task', label: 'Tasks', count: actions.filter(a => a.type === 'task').length },
            { id: 'follow_up', label: 'Follow-ups', count: actions.filter(a => a.type === 'follow_up').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-secondary text-secondary font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
              </div>
              <h3 className="font-bold text-base text-primary">All caught up!</h3>
              <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                There are no pending actions in this view. When new calls complete, Marcus will place action items here.
              </p>
            </div>
          ) : (
            filtered.map(action => {
              const style = getTypeIcon(action.type);
              const p = action.payload || {};
              const isWorking = isProcessing === action.id;

              return (
                <div key={action.id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:shadow transition-shadow flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.color} flex items-center justify-center shrink-0 mt-0.5 border ${style.border}`}>
                        <span className="material-symbols-outlined text-[18px]">{style.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
                            {action.type.replace('_', ' ')}
                          </span>
                          {action.person_name && (
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">person</span>
                              {action.person_name}
                            </span>
                          )}
                          {action.job_title && (
                            <span className="text-xs font-medium text-slate-500 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">work</span>
                              {action.job_title}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-primary mt-1 leading-snug">{action.title}</h4>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* DETAILS BODY BASED ON TYPE */}
                  {action.type === 'email' && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1.5">
                      <p><span className="font-semibold text-slate-500">To:</span> {p.email ? <span className="font-medium">{p.email}</span> : <span className="text-amber-600 font-bold">⚠️ No email on file (edit to provide)</span>}</p>
                      <p><span className="font-semibold text-slate-500">Subject:</span> <span className="font-medium text-primary">{p.subject || action.title}</span></p>
                      <div className="text-slate-600 line-clamp-3 italic pt-1 border-t border-slate-200/60 whitespace-pre-wrap">
                        "{p.body || action.description}"
                      </div>
                    </div>
                  )}

                  {action.type === 'reminder' && (
                    <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 text-xs text-amber-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">schedule</span>
                      <span>
                        <strong>When:</strong> {p.date || 'Soon'} {p.time ? `• ${p.time}` : ''}
                        {p.reason && <span className="text-amber-800 ml-1">({p.reason})</span>}
                      </span>
                    </div>
                  )}

                  {action.type === 'payment_reminder' && (
                    <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100 text-xs text-rose-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0">payment</span>
                      <span>
                        <strong>Payment Due:</strong> {p.amount ? `₹${Number(p.amount).toLocaleString()}` : 'Amount pending'}
                        {p.due_date && ` • ${p.due_date}`}
                        <span className="text-rose-700 block text-[10px] mt-0.5">Creates a Calendar follow-up reminder only (does not charge customer).</span>
                      </span>
                    </div>
                  )}

                  {action.type === 'task' && (
                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">assignment</span>
                      <span>
                        <strong>Target Job:</strong> {action.job_title || 'General'}
                        {p.due_date && ` • Due: ${p.due_date}`}
                        {action.description && <span className="text-emerald-800 block text-[10px] mt-0.5">{action.description}</span>}
                      </span>
                    </div>
                  )}

                  {action.type === 'follow_up' && action.description && (
                    <p className="text-xs text-slate-600 italic">"{action.description}"</p>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={isWorking}
                        onClick={() => handleDismiss(action)}
                        className="btn btn-outline text-xs py-1 px-2.5 text-slate-500 hover:text-red-600 hover:border-red-200"
                        title="Dismiss action"
                      >
                        Dismiss
                      </button>
                      <button
                        disabled={isWorking}
                        onClick={() => action.type === 'email' ? openEmailReview(action) : openEdit(action)}
                        className="btn btn-outline text-xs py-1 px-2.5 text-slate-600 hover:text-slate-800"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {action.type === 'email' ? (
                        <button
                          disabled={isWorking}
                          onClick={() => openEmailReview(action)}
                          className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[14px]">send</span>
                          Review & Send
                        </button>
                      ) : (
                        <button
                          disabled={isWorking}
                          onClick={() => handleConfirm(action)}
                          className="btn bg-primary text-white text-xs py-1.5 px-3.5 flex items-center gap-1 shadow-sm hover:bg-slate-800 font-bold"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          {action.type === 'payment_reminder' ? 'Create Reminder' : `Confirm ${action.type === 'task' ? 'Task' : 'Reminder'}`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* EMAIL REVIEW & SEND MODAL */}
      {reviewEmailAction && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="p-4 border-b bg-indigo-50/70 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">mail</span>
                <h3 className="text-base font-bold text-primary">Review & Send Email</h3>
              </div>
              <button onClick={() => setReviewEmailAction(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">To (Recipient Email):</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-1.5 text-xs text-primary outline-none focus:border-secondary"
                  value={emailForm.to}
                  onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
                  placeholder="recipient@example.com"
                />
                {!emailForm.to && (
                  <p className="text-[10px] text-red-600 font-medium mt-1">Recipient email is required to send.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Subject:</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-1.5 text-xs text-primary font-medium outline-none focus:border-secondary"
                  value={emailForm.subject}
                  onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Body:</label>
                <textarea
                  rows={7}
                  className="w-full border rounded p-3 text-xs text-slate-800 outline-none focus:border-secondary resize-y leading-relaxed font-sans"
                  value={emailForm.body}
                  onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
                  placeholder="Email body text"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleDismiss(reviewEmailAction)}
                className="btn btn-outline text-xs text-red-600 hover:bg-red-50"
              >
                Dismiss Email
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewEmailAction(null)}
                  className="btn btn-outline text-xs px-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!emailForm.to.trim() || isProcessing === reviewEmailAction.id}
                  onClick={() => handleConfirm(reviewEmailAction, { email: emailForm.to.trim(), subject: emailForm.subject.trim(), body: emailForm.body.trim() })}
                  className="btn btn-primary text-xs px-4 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  Send Email (SMTP)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL FOR REMINDERS / TASKS / FOLLOW-UPS */}
      {editingAction && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-base font-bold text-primary">Edit Pending {editingAction.type}</h3>
              <button onClick={() => setEditingAction(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Title:</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-1.5 text-xs text-primary font-medium outline-none focus:border-secondary"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              {editingAction.type === 'reminder' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date / Day:</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-1.5 text-xs text-primary outline-none focus:border-secondary"
                      value={editForm.date}
                      onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                      placeholder="e.g. Tuesday"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Time:</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-1.5 text-xs text-primary outline-none focus:border-secondary"
                      value={editForm.time}
                      onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                      placeholder="e.g. 16:00"
                    />
                  </div>
                </div>
              )}

              {(editingAction.type === 'task' || editingAction.type === 'payment_reminder') && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Due Date:</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-1.5 text-xs text-primary outline-none focus:border-secondary"
                    value={editForm.due_date}
                    onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                    placeholder="e.g. Tomorrow or Friday"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Notes / Description:</label>
                <textarea
                  rows={3}
                  className="w-full border rounded p-2.5 text-xs text-slate-800 outline-none focus:border-secondary"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAction(null)}
                className="btn btn-outline text-xs px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAndConfirmEdit}
                className="btn btn-primary text-xs px-4 font-bold"
              >
                Save & Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
