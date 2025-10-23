/**
 * Type definitions for Deep Research functionality
 */

export type DeepResearchStatus = 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed';

export interface DeepResearchJob {
  id: string;
  sessionId: string;
  responseId: string;
  status: DeepResearchStatus;
  prompt: string;
  result?: DeepResearchResult;
  error?: string;
  toolCalls?: ToolCall[];
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface DeepResearchResult {
  outputText: string;
  output: OutputItem[];
}

export type OutputItem = 
  | WebSearchCall
  | CodeInterpreterCall
  | FileSearchCall
  | MCPToolCall
  | MessageOutput;

export interface WebSearchCall {
  id: string;
  type: 'web_search_call';
  status: 'completed' | 'failed';
  action: WebSearchAction;
}

export type WebSearchAction = 
  | { type: 'search'; query: string }
  | { type: 'open_page'; url: string }
  | { type: 'find_in_page'; query: string };

export interface CodeInterpreterCall {
  id: string;
  type: 'code_interpreter_call';
  status: 'completed' | 'failed';
  code?: string;
  output?: string;
}

export interface FileSearchCall {
  id: string;
  type: 'file_search_call';
  status: 'completed' | 'failed';
  query?: string;
}

export interface MCPToolCall {
  id: string;
  type: 'mcp_tool_call';
  status: 'completed' | 'failed';
  server_label?: string;
  tool_name?: string;
}

export interface MessageOutput {
  type: 'message';
  content: MessageContent[];
}

export interface MessageContent {
  type: 'output_text';
  text: string;
  annotations?: Annotation[];
}

export interface Annotation {
  url: string;
  title: string;
  start_index: number;
  end_index: number;
}

export type ToolCall = 
  | WebSearchCall
  | CodeInterpreterCall
  | FileSearchCall
  | MCPToolCall;

// API Response Types

export interface StartDeepResearchRequest {
  sessionId: string;
}

export interface StartDeepResearchResponse {
  success: boolean;
  jobId?: string;
  responseId?: string;
  status?: DeepResearchStatus;
  error?: string;
}

export interface CheckDeepResearchStatusRequest {
  jobId: string;
}

export interface CheckDeepResearchStatusResponse {
  success: boolean;
  status?: DeepResearchStatus;
  result?: DeepResearchResult;
  error?: string;
  toolCalls?: ToolCall[];
  completedAt?: string;
}

// UI State Types

export interface DeepResearchUIState {
  job: DeepResearchJob | null;
  isStarting: boolean;
  isPolling: boolean;
  error: string | null;
}

// Helper type guards

export function isWebSearchCall(item: OutputItem): item is WebSearchCall {
  return item.type === 'web_search_call';
}

export function isCodeInterpreterCall(item: OutputItem): item is CodeInterpreterCall {
  return item.type === 'code_interpreter_call';
}

export function isFileSearchCall(item: OutputItem): item is FileSearchCall {
  return item.type === 'file_search_call';
}

export function isMCPToolCall(item: OutputItem): item is MCPToolCall {
  return item.type === 'mcp_tool_call';
}

export function isMessageOutput(item: OutputItem): item is MessageOutput {
  return item.type === 'message';
}

// Status helpers

export function isJobPending(status: DeepResearchStatus): boolean {
  return status === 'pending';
}

export function isJobInProgress(status: DeepResearchStatus): boolean {
  return status === 'in_progress';
}

export function isJobCompleted(status: DeepResearchStatus): boolean {
  return status === 'completed';
}

export function isJobFailed(status: DeepResearchStatus): boolean {
  return status === 'failed';
}

export function isJobActive(status: DeepResearchStatus): boolean {
  return isJobPending(status) || isJobInProgress(status);
}

export function isJobFinished(status: DeepResearchStatus): boolean {
  return isJobCompleted(status) || isJobFailed(status);
}
