import React, { useEffect, useRef, useState } from 'react';
import { CalendarService, JobsService, MarcusService, PaymentService, PeopleService, type MarcusResponse, type Person, type Job } from '../services/api';

type Transcript = { speaker: 'user' | 'assistant'; text: string };
const labels: Record<string, string> = { create_person: 'Add Person', create_job: 'Create Job', create_calendar_event: 'Create Reminder', create_payment: 'Request Payment' };
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
      setError(`${labels[review.intent]} completed and is now visible in Ergon.`); setReview(null);
    } catch (e: any) { setError(e?.response?.data?.detail || 'The action could not be completed.'); }
    finally { setFinalising(false); }
  };

  return <>
    <button onClick={() => { setOpen(true); start(); }} className="fixed right-5 bottom-24 z-[70] rounded-full bg-[#4b41e1] px-5 py-3 text-sm font-bold text-white shadow-lg flex gap-2 items-center"><span className="material-symbols-outlined">graphic_eq</span> Ask Makus</button>
    {open && <div className="fixed inset-0 z-[80] bg-slate-950/30 flex items-end justify-end p-4 sm:p-6" onMouseDown={() => !connected && setOpen(false)}><section className="w-full max-w-lg h-[min(700px,calc(100vh-2rem))] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" onMouseDown={e => e.stopPropagation()}>
      <header className="p-4 bg-[#091426] text-white flex justify-between"><div><strong>Makus</strong><p className="text-xs text-slate-300">Voice-first owner assistant</p></div>{!connected && <button onClick={() => setOpen(false)} className="text-xl">×</button>}</header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {review && <div className="bg-white border-2 border-indigo-200 rounded-xl p-4 shadow-sm"><p className="text-xs font-bold text-indigo-600 tracking-wider">REVIEW</p><h2 className="font-bold text-lg mt-1">{labels[review.intent]}</h2>
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
                <select disabled={!editing} value={review.parameters.job_id || ''} onChange={e => update('job_id', e.target.value)} className={`block w-full mt-1 rounded border p-2 text-sm text-slate-800 font-normal ${editing ? 'bg-white' : 'bg-slate-50'}`}>
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
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(value => !value)} className="px-3 py-2 text-sm">{editing ? 'Done' : 'Edit'}</button><button disabled={finalising} onClick={confirm} className="bg-[#4b41e1] text-white rounded px-3 py-2 text-sm font-bold">{labels[review.intent]}</button></div>
        </div>}
        {!connected && !review && !finalising && <div className="text-center py-14"><span className="material-symbols-outlined text-5xl text-[#4b41e1]">smart_toy</span><h2 className="font-bold text-lg mt-3">Connecting to Makus</h2><p className="text-sm text-slate-500 mt-2">Allow microphone access, then start speaking.</p></div>}
        {transcripts.map((t, i) => <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.speaker === 'user' ? 'ml-auto bg-[#4b41e1] text-white' : 'bg-white shadow-sm text-slate-700'}`}>{t.text}</div>)}
        {connected && <p className="text-center text-xs text-indigo-600 animate-pulse">Listening — speak naturally</p>}{finalising && <p className="text-center text-sm text-slate-500">Preparing your review…</p>}{error && <p className={`text-center text-sm ${error.includes('visible') ? 'text-green-700' : 'text-red-700'}`}>{error}</p>}<div ref={bottom}/>
      </div>
      {connected && <footer className="p-3 border-t"><button onClick={finish} className="w-full rounded-lg bg-red-600 py-3 text-white font-bold flex justify-center gap-2"><span className="material-symbols-outlined">call_end</span> End conversation & review</button></footer>}
    </section></div>}
  </>;
};
