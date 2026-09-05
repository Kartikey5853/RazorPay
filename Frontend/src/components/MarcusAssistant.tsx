import React, { useEffect, useRef, useState } from 'react';
import { CalendarService, JobsService, MarcusService, PaymentService, PeopleService, EmailService, type MarcusResponse, type Person, type Job } from '../services/api';

type Transcript = { speaker: 'user' | 'assistant'; text: string };
const labels: Record<string, string> = { create_person: 'Add Person', create_job: 'Create Job', create_calendar_event: 'Create Reminder', create_payment: 'Request Payment', create_task: 'Add Task', create_email: 'Send Email' };
const hidden = new Set(['person_id', 'job_id', 'person_ids', 'person_name', 'client_name', 'job_name', 'job_title', 'status', 'requirements', 'constraints']);

export const MarcusAssistant: React.FC = () => {
  const [open, setOpen] = useState(false), [connected, setConnected] = useState(false), [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [review, setReview] = useState<MarcusResponse | null>(null), [finalising, setFinalising] = useState(false), [editing, setEditing] = useState(false), [error, setError] = useState('');
  const [people, setPeople] = useState<Person[]>([]), [jobs, setJobs] = useState<Job[]>([]);
  const ws = useRef<WebSocket | null>(null), audio = useRef<AudioContext | null>(null), stream = useRef<MediaStream | null>(null), processor = useRef<ScriptProcessorNode | null>(null), source = useRef<MediaStreamAudioSourceNode | null>(null);
  const ended = useRef(false), transcriptRef = useRef<Transcript[]>([]), nextPlay = useRef(0), bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { transcriptRef.current = transcripts; bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcripts, review]);
  useEffect(() => {
    PeopleService.getAll().then(setPeople).catch(() => {});
    JobsService.getAll().then(setJobs).catch(() => {});
    return () => cleanUp();
  }, []);

  const cleanUp = () => {
    processor.current && (processor.current.onaudioprocess = null); processor.current?.disconnect(); processor.current = null;
    source.current?.disconnect(); source.current = null; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (audio.current) { audio.current.close(); audio.current = null; } ws.current = null; setConnected(false);
  };
  const append = (item: Transcript) => setTranscripts(old => {
    const copy = [...old], last = copy[copy.length - 1], text = item.text.trim(); if (!text) return old;
    if (last?.speaker === item.speaker) { if (text.startsWith(last.text)) last.text = text; else if (!last.text.endsWith(text)) last.text = `${last.text} ${text}`; }
    else copy.push({ ...item, text }); return copy;
  });
  const finish = async () => {
    if (ended.current) return; ended.current = true; cleanUp();
    const transcript = transcriptRef.current.map(t => `${t.speaker === 'user' ? 'OWNER' : 'MARCUS'}: ${t.text}`).join('\n');
    if (!transcript) return;
    setFinalising(true); setError('');
    try { setReview(await MarcusService.finalize(transcript)); setEditing(false); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Makus could not prepare the review.'); }
    finally { setFinalising(false); }
  };
  const start = async () => {
    try {
      ended.current = false; setError(''); setReview(null); setEditing(false); setTranscripts([]); transcriptRef.current = [];
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = mic;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 }); audio.current = ctx;
      const input = ctx.createMediaStreamSource(mic), worklet = ctx.createScriptProcessor(4096, 1, 1); source.current = input; processor.current = worklet;
      const token = localStorage.getItem('auth_token'); const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}`.replace('http', 'ws') + `/marcus/live?token=${token}`;
      const socket = new WebSocket(url); ws.current = socket;
      socket.onopen = () => {
        setConnected(true); let speaking = false, silenceAt = 0;
        worklet.onaudioprocess = event => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const values = event.inputBuffer.getChannelData(0); let total = 0; for (const value of values) total += value * value;
          const voice = Math.sqrt(total / values.length) >= 0.012; if (!voice && !speaking) return;
          const pcm = new Int16Array(values.length); for (let i = 0; i < values.length; i++) { const s = Math.max(-1, Math.min(1, values[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
          socket.send(pcm.buffer);
          if (voice) { speaking = true; silenceAt = 0; }
          else { if (!silenceAt) silenceAt = Date.now(); if (Date.now() - silenceAt >= 3650) { socket.send(JSON.stringify({ type: 'audio_stream_end' })); speaking = false; silenceAt = 0; } }
        };
        input.connect(worklet); worklet.connect(ctx.destination);
      };
      socket.onmessage = async event => {
        if (typeof event.data === 'string') { const data = JSON.parse(event.data); if (data.type === 'transcript') append(data); else if (data.type === 'error') { setError(data.message); finish(); } else if (data.type === 'interrupted') nextPlay.current = audio.current?.currentTime || 0; return; }
        if (!(event.data instanceof Blob) || !audio.current) return;
        const bytes = new Int16Array(await event.data.arrayBuffer()), samples = new Float32Array(bytes.length); for (let i = 0; i < bytes.length; i++) samples[i] = bytes[i] / 32768;
        const buffer = audio.current.createBuffer(1, samples.length, 24000); buffer.getChannelData(0).set(samples); const player = audio.current.createBufferSource(); player.buffer = buffer; player.connect(audio.current.destination);
        const now = audio.current.currentTime; player.start(Math.max(now, nextPlay.current)); nextPlay.current = Math.max(now, nextPlay.current) + buffer.duration;
      };
      socket.onclose = () => { if (!ended.current) finish(); };
    } catch { cleanUp(); setError('Microphone access is required to talk with Makus.'); }
  };
  const update = (key: string, value: string | string[]) => review && setReview({ ...review, parameters: { ...review.parameters, [key]: key === 'tags' && typeof value === 'string' ? value.split(',').map(tag => tag.trim()).filter(Boolean) : value } });
  const confirm = async () => {
    if (!review) return; const p = review.parameters; setFinalising(true); setError('');
    try {
      if (review.intent === 'create_person') await PeopleService.create({ name: p.name, type: p.type, email: p.email, phone: p.phone, company: p.company, location: p.location, tags: p.tags || [], notes: p.notes });
      if (review.intent === 'create_job') await JobsService.create({ title: p.title, description: p.description || '', objective: p.objective || '', status: p.status || 'draft', budget: p.budget, deadline: p.deadline, requirements: p.requirements || {}, constraints: p.constraints || {}, person_ids: p.person_ids || [] });
      if (review.intent === 'create_calendar_event') await CalendarService.create({ title: p.title, event_type: p.event_type, description: p.description, start_at: p.start_at, end_at: p.end_at, status: 'scheduled', person_id: p.person_id, job_id: p.job_id, currency: p.currency || 'INR' });
      if (review.intent === 'create_payment') await PaymentService.create({ title: p.title, amount: Number(p.amount), currency: p.currency || 'INR', description: p.description, due_at: p.due_at, status: 'pending', person_id: p.person_id, job_id: p.job_id });
      if (review.intent === 'create_task') {
        if (!p.job_id) throw new Error('A Job is required to create a Task.');
        await JobsService.createTask(p.job_id, {
          title: p.title,
          description: p.description,
          status: p.status || 'To Do',
          due_date: p.due_date ? new Date(p.due_date).toISOString() : undefined,
          person_ids: p.person_id ? [p.person_id] : [],
          subtasks: p.subtasks || []
        } as any);
      }
      if (review.intent === 'create_email') {
        if (!p.email) throw new Error('A recipient email address is required to send an email.');
        await EmailService.send({
          subject: p.subject,
          body: p.body,
          email: p.email,
          person_id: p.person_id || undefined,
          job_id: p.job_id || undefined
        });
      }
      setError(`${labels[review.intent]} completed and is now visible in Ergon.`);
      setReview(null);
    } catch (e: any) { setError(e?.response?.data?.detail || e?.message || 'The action could not be completed.'); }
    finally { setFinalising(false); }
  };

  return <>
    <button onClick={() => { setOpen(true); start(); }} className="fixed right-5 bottom-24 z-[70] rounded-full bg-[#4b41e1] hover:bg-[#3d33ca] px-5 py-3 text-sm font-bold text-white shadow-lg flex gap-2 items-center transition-transform hover:scale-105">
      <span className="material-symbols-outlined">graphic_eq</span> Ask Marcus
    </button>
    {open && <div className="fixed inset-0 z-[80] bg-slate-950/30 flex items-end justify-end p-4 sm:p-6" onMouseDown={() => !connected && setOpen(false)}>
      <section className="w-full max-w-lg h-[min(700px,calc(100vh-2rem))] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" onMouseDown={e => e.stopPropagation()}>
        <header className="p-4 bg-[#091426] text-white flex justify-between items-center">
          <div>
            <strong className="text-base tracking-tight">Marcus</strong>
            <p className="text-xs text-slate-300">Voice-first owner assistant</p>
          </div>
          {!connected && <button onClick={() => setOpen(false)} className="text-xl text-slate-400 hover:text-white p-1">×</button>}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {/* REVIEW CARD */}
          {review && (
            review.intent === 'create_task' ? (
              <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">REVIEW</p>
                    <h2 className="font-bold text-lg text-slate-900 mt-0.5">Create Task</h2>
                  </div>
                  <button onClick={() => setReview(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500">Task</label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full mt-1 border rounded p-2 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                      value={review.parameters.title || ''}
                      onChange={e => update('title', e.target.value)}
                      placeholder="Task title"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{review.parameters.title || <span className="text-amber-600 italic">⚠️ Missing title</span>}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500">Job</label>
                  {editing || !review.parameters.job_id ? (
                    <select
                      value={review.parameters.job_id || ''}
                      onChange={e => {
                        const j = jobs.find(job => job.id === e.target.value);
                        update('job_id', e.target.value);
                        if (j) update('job_title', j.title);
                      }}
                      className={`w-full mt-1 border rounded p-2 text-sm text-slate-800 outline-none focus:border-indigo-600 ${!review.parameters.job_id ? 'border-amber-400 bg-amber-50' : 'bg-white'}`}
                    >
                      <option value="" disabled>⚠️ Select a job</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{review.parameters.job_title || jobs.find(j => j.id === review.parameters.job_id)?.title || '—'}</p>
                  )}
                </div>

                {review.parameters.due_date && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Due</label>
                    {editing ? (
                      <input
                        type="text"
                        className="w-full mt-1 border rounded p-2 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                        value={review.parameters.due_date || ''}
                        onChange={e => update('due_date', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{review.parameters.due_date}</p>
                    )}
                  </div>
                )}

                {review.parameters.subtasks && review.parameters.subtasks.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Subtasks</label>
                    <ul className="space-y-1 bg-slate-50 p-2.5 rounded-lg border text-xs text-slate-700">
                      {review.parameters.subtasks.map((st: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.parameters.person_name && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500">Person</label>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{review.parameters.person_name}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2 pt-2 border-t">
                  <button onClick={() => setReview(null)} className="btn btn-outline text-xs py-2 px-3 rounded">Cancel</button>
                  <button onClick={() => setEditing(v => !v)} className="btn btn-outline text-xs py-2 px-3 rounded">{editing ? 'Done' : 'Edit'}</button>
                  <button
                    disabled={finalising || !review.parameters.title || !review.parameters.job_id}
                    onClick={confirm}
                    className="btn bg-[#4b41e1] hover:bg-[#3d33ca] text-white text-xs font-bold py-2 px-4 rounded shadow-sm disabled:opacity-50"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            ) : review.intent === 'create_email' ? (
              <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">REVIEW EMAIL</p>
                    <h2 className="font-bold text-lg text-slate-900 mt-0.5">Send Email</h2>
                  </div>
                  <button onClick={() => setReview(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-500">To:</label>
                    {review.parameters.person_name && (
                      <span className="text-[11px] text-slate-500 font-medium">{review.parameters.person_name}</span>
                    )}
                  </div>
                  {editing || !review.parameters.email ? (
                    <div className="mt-1 space-y-1">
                      <input
                        type="email"
                        className={`w-full border rounded p-2 text-sm text-slate-800 outline-none focus:border-indigo-600 ${!review.parameters.email ? 'border-amber-400 bg-amber-50 placeholder:text-amber-700' : 'bg-white'}`}
                        value={review.parameters.email || ''}
                        onChange={e => update('email', e.target.value)}
                        placeholder="Recipient email address (required)"
                      />
                      {!review.parameters.email && (
                        <p className="text-[11px] text-amber-700 font-medium">⚠️ No email address on file. Please enter recipient email before sending.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">{review.parameters.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500">Subject:</label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full mt-1 border rounded p-2 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white"
                      value={review.parameters.subject || ''}
                      onChange={e => update('subject', e.target.value)}
                      placeholder="Email subject"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{review.parameters.subject || <span className="text-amber-600 italic">⚠️ No subject</span>}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500">Body:</label>
                  {editing ? (
                    <textarea
                      rows={6}
                      className="w-full mt-1 border rounded p-2 text-sm text-slate-800 outline-none focus:border-indigo-600 bg-white resize-y font-sans leading-relaxed"
                      value={review.parameters.body || ''}
                      onChange={e => update('body', e.target.value)}
                      placeholder="Email body text"
                    />
                  ) : (
                    <div className="mt-1 bg-slate-50 p-3 rounded-lg border text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {review.parameters.body || <span className="text-amber-600 italic">⚠️ No body content</span>}
                    </div>
                  )}
                </div>

                {review.parameters.job_title && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold">Project:</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{review.parameters.job_title}</span>
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2 pt-2 border-t">
                  <button onClick={() => setReview(null)} className="btn btn-outline text-xs py-2 px-3 rounded">Cancel</button>
                  <button onClick={() => setEditing(v => !v)} className="btn btn-outline text-xs py-2 px-3 rounded">{editing ? 'Done' : 'Edit'}</button>
                  <button
                    disabled={finalising || !review.parameters.email}
                    onClick={confirm}
                    className="btn bg-[#4b41e1] hover:bg-[#3d33ca] text-white text-xs font-bold py-2 px-4 rounded shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    Send Email
                  </button>
                </div>
              </div>
            ) : (
              /* Generic review for other intents */
              <div className="bg-white border-2 border-indigo-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-bold text-indigo-600 tracking-wider">REVIEW</p>
                <h2 className="font-bold text-lg mt-1">{labels[review.intent]}</h2>
                {Object.entries(review.parameters).filter(([key, value]) => !hidden.has(key) && value !== undefined && value !== null).map(([key, value]) => 
                  <label key={key} className="block mt-3 text-xs font-semibold text-slate-500 capitalize">{key.replaceAll('_', ' ')}
                    <input readOnly={!editing} value={Array.isArray(value) ? value.join(', ') : String(value)} onChange={e => update(key, e.target.value)} className={`block w-full mt-1 rounded border p-2 text-sm text-slate-800 font-normal ${editing ? 'bg-white' : 'bg-slate-50'} ${!value && !editing ? 'border-amber-400 bg-amber-50 placeholder:text-amber-600' : ''}`} placeholder={!value && !editing ? '⚠️ Missing information' : ''}/>
                  </label>
                )}
                {['create_payment', 'create_calendar_event'].includes(review.intent) && (
                  <>
                    <label className="block mt-3 text-xs font-semibold text-slate-500">Person
                      <select disabled={!editing && !!review.parameters.person_id} value={review.parameters.person_id || ''} onChange={e => update('person_id', e.target.value)} className={`block w-full mt-1 rounded border p-2 text-sm text-slate-800 font-normal ${!review.parameters.person_id ? 'border-amber-400 bg-amber-50' : (editing ? 'bg-white' : 'bg-slate-50')}`}>
                        <option value="" disabled>⚠️ Select person</option>
                        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </label>
                    <label className="block mt-3 text-xs font-semibold text-slate-500">Job (Optional)
                      <select disabled={!editing && !!review.parameters.job_id} value={review.parameters.job_id || ''} onChange={e => update('job_id', e.target.value)} className={`block w-full mt-1 rounded border p-2 text-sm text-slate-800 font-normal ${editing ? 'bg-white' : 'bg-slate-50'}`}>
                        <option value="">—</option>
                        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                      </select>
                    </label>
                  </>
                )}
                {review.intent === 'create_job' && (
                  <label className="block mt-3 text-xs font-semibold text-slate-500">Client / Person (Optional)
                    <select disabled={!editing} value={review.parameters.person_ids?.[0] || ''} onChange={e => update('person_ids', e.target.value ? [e.target.value] : [])} className={`block w-full mt-1 rounded border p-2 text-sm text-slate-800 font-normal ${editing ? 'bg-white' : 'bg-slate-50'}`}>
                      <option value="">—</option>
                      {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setReview(null)} className="btn btn-outline text-xs py-2 px-3 rounded">Cancel</button>
                  <button onClick={() => setEditing(value => !value)} className="px-3 py-2 text-sm">{editing ? 'Done' : 'Edit'}</button>
                  <button disabled={finalising} onClick={confirm} className="bg-[#4b41e1] text-white rounded px-3 py-2 text-sm font-bold">{labels[review.intent]}</button>
                </div>
              </div>
            )
          )}
          {!connected && !review && !finalising && (
            <div className="text-center py-14">
              <span className="material-symbols-outlined text-5xl text-[#4b41e1]">smart_toy</span>
              <h2 className="font-bold text-lg mt-3">Connecting to Marcus</h2>
              <p className="text-sm text-slate-500 mt-2">Allow microphone access, then start speaking.</p>
            </div>
          )}
          {transcripts.map((t, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.speaker === 'user' ? 'ml-auto bg-[#4b41e1] text-white' : 'bg-white shadow-sm text-slate-700'}`}>{t.text}</div>
          ))}
          {connected && <p className="text-center text-xs text-indigo-600 animate-pulse">Listening — speak naturally</p>}
          {finalising && <p className="text-center text-sm text-slate-500">Preparing your review…</p>}
          {error && <p className={`text-center text-sm ${error.includes('visible') ? 'text-green-700' : 'text-red-700'}`}>{error}</p>}
          <div ref={bottom}/>
        </div>
        {connected && (
          <footer className="p-3 border-t">
            <button onClick={finish} className="w-full rounded-lg bg-red-600 py-3 text-white font-bold flex justify-center gap-2 items-center">
              <span className="material-symbols-outlined">call_end</span> End conversation & review
            </button>
          </footer>
        )}
      </section>
    </div>}
  </>;
};
