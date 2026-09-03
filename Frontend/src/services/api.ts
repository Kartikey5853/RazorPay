import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000', headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config: InternalAxiosRequestConfig) => { const token = localStorage.getItem('auth_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(r => r, (error: AxiosError<{detail?: string}>) => { if (error.response?.status === 401) { localStorage.removeItem('auth_token'); if (location.pathname !== '/login') location.assign('/login'); } return Promise.reject(error); });
export const errorMessage = (error: unknown) => axios.isAxiosError<{detail?: string}>(error) ? error.response?.data?.detail || error.message : 'Something went wrong';
export interface User { id: string; name: string; email: string; business_name: string; timezone: string }
export interface Person { id: string; name: string; type: string; email?: string; phone?: string; company?: string; location?: string; tags: string[]; notes?: string; created_at: string; updated_at: string; jobs?: Job[]; tasks?: Task[]; calls?: any[]; messages?: any[]; payments?: Payment[]; }
export interface Task { id: string; title: string; description?: string; status: string; priority?: string; sprint?: string; due_date?: string; created_at: string; people?: Person[]; parent_task_id?: string; }
export interface Milestone { id: string; title: string; date: string; created_at: string }
export interface Payment { id: string; amount: number; currency: string; status: string; description?: string; created_at: string }
export interface Job { id: string; title: string; description: string; objective: string; status: string; budget?: number; deadline?: string; requirements: any; constraints: any; ai_plan?: any; current_action?: string; created_at: string; people?: Person[]; tasks?: Task[]; milestones?: Milestone[]; payments?: Payment[]; calls?: any[] }
export interface Activity { id: string; type: string; title: string; description?: string; created_at: string }
export interface CallAssistantConfig { objective: string; target_person: string; required_information: string[]; qualification_criteria: string[]; conversation_rules: string[]; disqualification_conditions: string[]; call_end_conditions: string[]; follow_up: string[] }
export type PersonInput = Omit<Person, 'id' | 'created_at' | 'updated_at'>;
export type JobInput = Pick<Job, 'title' | 'description' | 'objective' | 'status' | 'budget' | 'deadline' | 'requirements' | 'constraints'> & { person_ids?: string[] };
export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'sprint' | 'due_date' | 'parent_task_id'> & { person_ids?: string[] };
export type MilestoneInput = Pick<Milestone, 'title' | 'date'>;
export const AuthService = { register: (data: {name:string;email:string;password:string;business_name:string;timezone?:string}) => api.post<{access_token:string;user:User}>('/auth/register', data).then(r=>r.data), login: (data:{email:string;password:string}) => api.post<{access_token:string;user:User}>('/auth/login', data).then(r=>r.data) };
export const PeopleService = { getAll: (params?: {search?:string;type?:string}) => api.get<Person[]>('/people',{params}).then(r=>r.data), getById:(id:string)=>api.get<Person>(`/people/${id}`).then(r=>r.data), create:(data:PersonInput)=>api.post<Person>('/people',data).then(r=>r.data), update:(id:string,data:Partial<PersonInput>)=>api.patch<Person>(`/people/${id}`,data).then(r=>r.data), remove:(id:string)=>api.delete(`/people/${id}`), activities:(id:string)=>api.get<Activity[]>(`/people/${id}/activities`).then(r=>r.data) };
export const JobsService = { 
  getAll:()=>api.get<Job[]>('/jobs').then(r=>r.data), 
  getById:(id:string)=>api.get<Job>(`/jobs/${id}`).then(r=>r.data), 
  create:(data:JobInput)=>api.post<Job>('/jobs',data).then(r=>r.data), 
  update:(id:string,data:Partial<JobInput>)=>api.patch<Job>(`/jobs/${id}`,data).then(r=>r.data), 
  plan:(id:string)=>api.post(`/jobs/${id}/ai/plan`).then(r=>r.data), 
  nextAction:(id:string)=>api.get(`/jobs/${id}/ai/next-action`).then(r=>r.data),
  addPerson:(jobId:string, personId:string)=>api.post(`/jobs/${jobId}/people`, { person_id: personId }).then(r=>r.data),
  removePerson:(jobId:string, personId:string)=>api.delete(`/jobs/${jobId}/people/${personId}`),
  getTasks:(jobId:string)=>api.get<Task[]>(`/jobs/${jobId}/tasks`).then(r=>r.data),
  createTask:(jobId:string, data:TaskInput)=>api.post<Task>(`/jobs/${jobId}/tasks`, data).then(r=>r.data),
  updateTask:(taskId:string, data:Partial<TaskInput>)=>api.patch<Task>(`/tasks/${taskId}`, data).then(r=>r.data),
  deleteTask:(taskId:string)=>api.delete(`/tasks/${taskId}`),
  createMilestone:(jobId:string, data:MilestoneInput)=>api.post<Milestone>(`/jobs/${jobId}/milestones`, data).then(r=>r.data),
  updateMilestone:(milestoneId:string, data:Partial<MilestoneInput>)=>api.patch<Milestone>(`/milestones/${milestoneId}`, data).then(r=>r.data),
  deleteMilestone:(milestoneId:string)=>api.delete(`/milestones/${milestoneId}`),
  getActivities:(jobId:string)=>api.get<Activity[]>(`/jobs/${jobId}/activities`).then(r=>r.data)
  ,callAssistantChat:(jobId:string, messages:{role:'user'|'assistant';text:string}[])=>api.post<{text:string}>(`/jobs/${jobId}/call-assistant/chat`,{messages}).then(r=>r.data)
  ,generateCallAssistantConfig:(jobId:string, messages:{role:'user'|'assistant';text:string}[])=>api.post<CallAssistantConfig>(`/jobs/${jobId}/call-assistant/generate`,{messages}).then(r=>r.data)
};
export const DashboardService = { summary:()=>api.get<{active_jobs:number;people:number;pending_actions:number;activities:Activity[]}>('/dashboard/summary').then(r=>r.data) };
export const ActionService = { call:(data:{person_id?:string;job_id?:string})=>api.post('/calls',data).then(r=>r.data), message:(data:{person_id:string;job_id?:string;content:string;channel?:string})=>api.post('/messages',data).then(r=>r.data), payment:(data:{amount:number;person_id?:string;job_id?:string;currency?:string;description?:string})=>api.post('/payments',data).then(r=>r.data) };
export const SettingsService = { get:()=>api.get<User>('/settings').then(r=>r.data), update:(data:Partial<User>)=>api.patch<User>('/settings',data).then(r=>r.data) };
export default api;
