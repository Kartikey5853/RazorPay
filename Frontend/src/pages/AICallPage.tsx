import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { PeopleService, JobsService, type Person, type Job, type CallAssistantConfig } from '../services/api';

type CallPhase = 'SETUP' | 'CONFIRM' | 'CALL' | 'SUMMARY';

interface TranscriptItem {
    speaker: 'user' | 'assistant';
    text: string;
}

export const AICallPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const personId = searchParams.get('person_id');
    const initialJobId = searchParams.get('job_id');
    
    const [phase, setPhase] = useState<CallPhase>('SETUP');
    const [person, setPerson] = useState<Person | null>(null);
    
    // Setup state
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [config, setConfig] = useState<CallAssistantConfig | null>(null);
    
    // Call state
    const [duration, setDuration] = useState(0);
    const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    
    // Summary state
    const [summaryResult, setSummaryResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    
    useEffect(() => {
        if (personId) {
            PeopleService.getById(personId).then(setPerson).catch(console.error);
        }
        JobsService.getAll().then(setJobs).catch(console.error);
    }, [personId]);
    
    useEffect(() => {
        if (selectedJobId) {
            const job = jobs.find(j => j.id === selectedJobId);
            setSelectedJob(job || null);
            if (job && job.ai_plan && job.ai_plan.call_assistant_config) {
                setConfig(job.ai_plan.call_assistant_config);
            } else {
                setConfig(null);
            }
        }
    }, [selectedJobId, jobs]);
    
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (phase === 'CALL' && isConnected) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [phase, isConnected]);

    const handleStartCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            const AudioContextCls = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextCls({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;
            
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            const token = localStorage.getItem('auth_token');
            const wsUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}`.replace('http', 'ws') + `/jobs/${selectedJobId}/call-assistant/live?token=${token}`;
            
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            
            ws.onopen = () => {
                setIsConnected(true);
                setPhase('CALL');
                
                processor.onaudioprocess = (e) => {
                    if (ws.readyState !== WebSocket.OPEN) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        let s = Math.max(-1, Math.min(1, inputData[i]));
                        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    ws.send(pcm16.buffer);
                };
                source.connect(processor);
                processor.connect(audioCtx.destination);
            };
            
            let nextPlayTime = 0;
            
            ws.onmessage = async (e) => {
                if (typeof e.data === 'string') {
                    const data = JSON.parse(e.data);
                    if (data.type === 'transcript') {
                        setTranscripts(prev => {
                            const newTranscripts = [...prev];
                            const last = newTranscripts.length > 0 ? newTranscripts[newTranscripts.length - 1] : null;
                            if (last && last.speaker === data.speaker) {
                                last.text = last.text.trim() + ' ' + data.text.trim();
                            } else {
                                newTranscripts.push({ speaker: data.speaker, text: data.text.trim() });
                            }
                            return newTranscripts;
                        });
                    } else if (data.type === 'error') {
                        console.error('Call Error:', data.message);
                        handleEndCall();
                    }
                } else if (e.data instanceof Blob) {
                    const buffer = await e.data.arrayBuffer();
                    const int16 = new Int16Array(buffer);
                    const float32 = new Float32Array(int16.length);
                    for(let i=0; i<int16.length; i++) {
                        float32[i] = int16[i] / 32768.0;
                    }
                    const playAudioCtx = audioContextRef.current;
                    if (playAudioCtx) {
                        const audioBuffer = playAudioCtx.createBuffer(1, float32.length, 24000);
                        audioBuffer.getChannelData(0).set(float32);
                        const playSource = playAudioCtx.createBufferSource();
                        playSource.buffer = audioBuffer;
                        playSource.connect(playAudioCtx.destination);
                        
                        const currentTime = playAudioCtx.currentTime;
                        if (currentTime < nextPlayTime) {
                            playSource.start(nextPlayTime);
                            nextPlayTime += audioBuffer.duration;
                        } else {
                            playSource.start(currentTime);
                            nextPlayTime = currentTime + audioBuffer.duration;
                        }
                    }
                }
            };
            
            ws.onclose = () => {
                handleEndCall();
            };
            
        } catch (err) {
            console.error('Failed to start call', err);
            alert('Could not start call. Please check microphone permissions.');
        }
    };

    const handleEndCall = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsConnected(false);
        setPhase('SUMMARY');
        generateSummary();
    };
    
    const generateSummary = async () => {
        setIsSaving(true);
        // Simulate sending to backend for summary generation
        const fullTranscript = transcripts.map(t => `${t.speaker === 'user' ? 'CANDIDATE' : 'MARCUS'}: ${t.text}`).join('\n');
        
        const summary = "Discussed job opportunity and collected candidate requirements.";
        
        const mockResult = {
            summary: ["Candidate expressed interest", "Available immediately", "Has 5 years experience"],
            information_collected: { skills: ["React", "Python"], experience: ["5 years"], interests: ["AI"], availability: "Immediate", compensation: "Not discussed" },
            call_outcome: "interested",
            next_action: "Schedule follow up interview"
        };
        
        try {
            await api.post('/calls', {
                person_id: personId,
                job_id: selectedJobId || undefined,
                duration_seconds: duration,
                transcript: fullTranscript,
                summary: summary,
                extracted_data: mockResult
            });
            setSummaryResult(mockResult);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!person) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading interface...</div>;
    }

    const initials = person.name ? person.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '??';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 py-12">
            
            {phase === 'SETUP' && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-lg p-8 animate-in fade-in">
                    <h2 className="text-2xl font-bold text-primary mb-6">Call Setup</h2>
                    
                    <div className="mb-6 flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-primary font-bold text-lg">
                            {initials}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">Calling</p>
                            <p className="text-sm font-bold text-primary">{person.name}</p>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Select Job</label>
                        <select 
                            className="w-full bg-white border border-slate-300 rounded-md px-3 py-3 text-sm outline-none focus:border-secondary font-medium"
                            value={selectedJobId}
                            onChange={e => setSelectedJobId(e.target.value)}
                        >
                            <option value="" disabled>-- Select a Job --</option>
                            {jobs.map(job => (
                                <option key={job.id} value={job.id}>{job.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button onClick={() => navigate(-1)} className="btn btn-outline py-2 px-6">Cancel</button>
                        <button 
                            onClick={() => setPhase('CONFIRM')} 
                            disabled={!selectedJobId} 
                            className="btn btn-primary py-2 px-6 disabled:opacity-50"
                        >
                            Next Step
                        </button>
                    </div>
                </div>
            )}
            
            {phase === 'CONFIRM' && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-2xl p-8 animate-in fade-in slide-in-from-right-4">
                    <h2 className="text-2xl font-bold text-primary mb-2">Confirm AI Configuration</h2>
                    <p className="text-sm text-on-surface-variant mb-6">Ergon will use the following configuration for this call.</p>
                    
                    {!config ? (
                        <div className="p-6 bg-red-50 border border-red-100 rounded-lg text-center mb-6">
                            <span className="material-symbols-outlined text-red-500 text-3xl mb-2">warning</span>
                            <p className="text-sm font-bold text-red-800">No AI Configuration Found</p>
                            <p className="text-xs text-red-600 mt-1">This job does not have an active Call Assistant Configuration.</p>
                        </div>
                    ) : (
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-6 mb-8 max-h-[400px] overflow-y-auto">
                            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Ergon will:</h3>
                            <ul className="list-disc pl-5 text-sm text-primary space-y-2 mb-6">
                                <li>Explain the opportunity context</li>
                                <li>Collect required information: {config.required_information?.join(', ')}</li>
                                <li>Check against qualification criteria</li>
                                <li>Determine if disqualification applies</li>
                                <li>{config.follow_up?.join(', ')}</li>
                            </ul>
                            
                            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Objective</h3>
                            <p className="text-sm text-primary mb-4">{config.objective}</p>
                            
                            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Target Person</h3>
                            <p className="text-sm text-primary">{config.target_person}</p>
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setPhase('SETUP')} className="btn btn-outline py-2 px-6">Back</button>
                        <button 
                            onClick={handleStartCall} 
                            disabled={!config} 
                            className="btn btn-primary py-2 px-6 shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                            Start Conversation
                        </button>
                    </div>
                </div>
            )}
            
            {phase === 'CALL' && (
                <div className="container w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in zoom-in-95">
                    
                    {/* LEFT COLUMN: ORB & STATUS */}
                    <div className="md:col-span-4 flex flex-col gap-6">
                        <div className="glass-panel p-8 rounded-xl flex flex-col items-center text-center shadow-sm bg-white border border-slate-200">
                            <div className="relative">
                                <div className={`absolute inset-0 rounded-full bg-secondary opacity-20 ${isConnected ? 'animate-ping' : ''}`}></div>
                                <div className="w-24 h-24 rounded-full mb-4 border-4 border-white bg-slate-200 flex items-center justify-center text-primary font-bold text-3xl shadow-inner relative z-10">
                                    {initials}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold mb-1 text-primary tracking-tight">{person.name}</h2>
                            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">{person.type || 'Contact'}</p>
                        </div>
                        
                        <div className="glass-panel p-6 rounded-xl shadow-sm bg-white border border-slate-200 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</span>
                                <span className={`text-xs font-bold flex items-center gap-2 px-2 py-1 rounded ${isConnected ? 'bg-indigo-50 text-secondary' : 'bg-yellow-50 text-yellow-700'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-yellow-500'}`}></div> 
                                    {isConnected ? 'Speaking' : 'Connecting...'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration</span>
                                <span className="font-mono font-bold text-lg text-primary">{formatDuration(duration)}</span>
                            </div>
                        </div>

                        {selectedJob && config && (
                            <div className="glass-panel p-6 rounded-xl shadow-sm bg-indigo-50/50 border border-indigo-100 flex flex-col gap-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-secondary">Active Configuration</h3>
                                <p className="text-xs font-bold text-primary">{selectedJob.title}</p>
                                <p className="text-[10px] text-primary mt-1 line-clamp-3"><span className="font-bold">Objective:</span> {config.objective}</p>
                            </div>
                        )}
                        
                        <button onClick={handleEndCall} className="btn bg-error text-white shadow-sm py-4 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors mt-auto">
                            <span className="material-symbols-outlined text-[20px]">call_end</span> 
                            End Call
                        </button>
                    </div>
                    
                    {/* RIGHT COLUMN: TRANSCRIPT */}
                    <div className="md:col-span-8 glass-panel rounded-xl flex flex-col shadow-sm bg-white border border-slate-200 overflow-hidden" style={{ height: '600px' }}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="flex items-center gap-2 text-primary font-bold text-sm">
                                <span className="material-symbols-outlined text-[18px]">subtitles</span> Live Transcript
                            </span>
                            <span className="text-[10px] font-mono text-on-surface-variant">Real-time Connection</span>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
                            {transcripts.length === 0 ? (
                                <div className="h-full flex items-center justify-center flex-col text-on-surface-variant gap-4">
                                    <span className="material-symbols-outlined text-4xl opacity-20">forum</span>
                                    <p className="text-sm">Conversation will appear here...</p>
                                </div>
                            ) : (
                                transcripts.map((t, idx) => (
                                    <div key={idx} className={`flex gap-4 max-w-[85%] ${t.speaker === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.speaker === 'assistant' ? 'bg-secondary' : 'bg-slate-200'}`}>
                                            {t.speaker === 'assistant' ? (
                                                <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
                                            ) : (
                                                <span className="font-bold text-primary text-xs">{initials[0]}</span>
                                            )}
                                        </div>
                                        <div className={`p-3 rounded-lg text-sm border ${t.speaker === 'assistant' ? 'bg-slate-50 text-primary border-slate-200 rounded-tl-none' : 'bg-primary text-white border-primary rounded-tr-none'}`}>
                                            {t.text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {phase === 'SUMMARY' && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-primary p-6 text-white text-center">
                        <span className="material-symbols-outlined text-4xl mb-2 text-indigo-200">check_circle</span>
                        <h2 className="text-2xl font-bold">Call Completed</h2>
                        <p className="text-sm text-indigo-200 mt-1">Duration: {formatDuration(duration)}</p>
                    </div>
                    
                    <div className="p-8">
                        {isSaving ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-primary">Generating AI Summary...</p>
                                <p className="text-xs text-on-surface-variant">Processing transcript and extracting information.</p>
                            </div>
                        ) : summaryResult ? (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3 border-b pb-2">Summary</h3>
                                    <ul className="list-disc pl-5 text-sm text-primary space-y-1">
                                        {summaryResult.summary.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3 border-b pb-2">Extracted Information</h3>
                                        <div className="text-sm text-primary space-y-2">
                                            <p><span className="font-bold">Skills:</span> {summaryResult.information_collected?.skills?.join(', ')}</p>
                                            <p><span className="font-bold">Experience:</span> {summaryResult.information_collected?.experience?.join(', ')}</p>
                                            <p><span className="font-bold">Availability:</span> {summaryResult.information_collected?.availability}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3 border-b pb-2">Outcome</h3>
                                        <p className="text-sm text-primary mb-2">
                                            <span className="inline-block px-2 py-1 bg-indigo-50 text-secondary font-bold text-xs rounded uppercase tracking-widest">
                                                {summaryResult.call_outcome}
                                            </span>
                                        </p>
                                        <p className="text-sm text-primary"><span className="font-bold text-on-surface-variant text-xs">Next Action:</span><br/>{summaryResult.next_action}</p>
                                    </div>
                                </div>
                                
                                <div className="pt-4 flex justify-end">
                                    <button onClick={() => navigate(`/person/${personId}`)} className="btn btn-primary py-2 px-8">
                                        Return to Profile
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-error">Failed to generate summary.</p>
                                <button onClick={() => navigate(`/person/${personId}`)} className="btn btn-outline mt-4">Return</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
        </div>
    );
};
