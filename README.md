# LLM SERVICE

This project is an LLM orchestration service implemented in Node.js + TypeScript.


### INTRO

This service consumes tasks from Redis message lists, runs LLM-oriented workflows, and writes results back to Redis. The core workflows are `chat`, `knowledge`, `memory`, and `topic`, built from reusable steps and backed by pluggable modules (LLM, long-term memory, embeddings, vector store, MCP tools, PostgreSQL, cache, etc.).


**Features**
- [x] Redis-based task queue consumption and result publishing
- [x] LLM-oriented workflows (`chat`, `knowledge`, `memory`, `topic`) composed from reusable steps
- [x] Multi-component orchestration (LLM, long-term memory, embeddings, vector store, MCP tools)
- [x] Chroma (or pluggable vector store) for knowledge retrieval


**Specials**
- Task processing is fully asynchronous — tasks are driven by Redis lists.
- The service is composed of reusable modules (cache, message list, LLM, memory, embeddings, vector store, MCP) orchestrated by a centralized lifecycle layer.


### FOLDER STRUCTURE

```text
├── src
│   ├── handlers          : Process-level lifecycle handlers and task entrypoints
│   │   ├── msglist       : Message list task handlers (chat, knowledge, etc.)
│   │   └── process.ts    : Process-level signal handlers & lifecycle management
│   ├── modules           : Core module wrappers providing reusable capabilities
│   │   ├── betterlog.ts  : Improved logging utilities
│   │   ├── cache.ts      : Redis cache module
│   │   ├── chroma.ts     : Chroma vector store client module
│   │   ├── embedding.ts  : Embedding model client module
│   │   ├── llm.ts        : LLM provider client module
│   │   ├── mcp.ts        : MCP service client module
│   │   ├── memory.ts     : Long-term memory model client module
│   │   ├── msglist.ts    : Redis message list client module
│   │   └── pg.ts         : PostgreSQL client module
│   ├── server            : HTTP server wiring (middlewares + route groups)
│   │   ├── apis          : HTTP API route groups
│   │   │   └── health    : Health check API
│   │   ├── midwares      : Common HTTP middlewares
│   │   │   └── auth.ts   : Auth middleware (request logging, IP allowlist check)
│   │   ├── modules       : Server-level shared modules
│   │   │   └── errs.ts   : Shared error helpers
│   │   └── index.ts      : App creation + middleware registration + router mounting
│   ├── steps             : Reusable workflow steps
│   │   ├── appendHistory.ts     : Append recent turns into conversation history
│   │   ├── extractMemory.ts     : Extract long-term memory candidates from chat
│   │   ├── generateReply.ts     : Call LLM to generate assistant reply
│   │   ├── ingestKnowledge.ts   : Ingest knowledge into the vector store
│   │   ├── index.ts             : Step exports
│   │   ├── loadHistory.ts       : Load conversation history from storage
│   │   ├── retrieveKnowledge.ts : Retrieve relevant knowledge documents
│   │   ├── retrieveMemory.ts    : Retrieve long-term memory entries
│   │   └── storeMemory.ts       : Store or update long-term memory entries
│   ├── workflows         : Orchestrated LLM task workflows built from reusable steps
│   │   ├── chat.ts             : Chat workflow (knowledge + memory + topic + history + tools)
│   │   ├── knowledge.ts        : Knowledge ingestion workflow
│   │   ├── memory.ts           : Long-term memory extraction workflow
│   │   └── topic.ts            : Topic summarization workflow
│   ├── app.ts            : Application entrypoint (starts the service and registers process signal handlers)
│   ├── config.ts         : Environment variable configuration
│   ├── init.ts           : Service lifecycle orchestration (init/stop HTTP server + init/stop modules)
│   ├── type.ts           : Custom data types
│   └── util.ts           : Shared utilities/helpers
├── Dockerfile
├── package.json
└── tsconfig.json
```


### REQUEST AND RESPONSE PATH     

#### Task processing pipeline

1. The service listens on the configured Redis lists (`MSG_LIST_LISTEN`) and pulls pending tasks.
2. Each task is routed to the appropriate handler under `src/handlers/msglist` (for example, chat, knowledge, or error).
3. The selected workflow in `src/workflows` runs a sequence of steps from `src/steps` (load history, retrieve knowledge or memory, generate a reply, store memory, and so on).
4. The workflow writes the final result back to Redis through the cache and message-list modules.


### HOW TO EXTEND

#### Add a new task

1. Define the task's typed input and output in `src/type.ts` by extending `WorkflowIOMap` and `WorkflowType`.
2. Add a new handler under `src/handlers/msglist/` to define how to process this task type.
3. Compose or create a workflow under `src/workflows/` using existing or new steps from `src/steps/`.
4. Wire the new handler into the message list listener logic.


### CONVENTION

- **Workflows**
  - Each workflow under `src/workflows` should describe a clear LLM task and be composed of reusable steps from `src/steps` (a `steps` array of `StepConfig<T>`).

```ts
interface StepConfig<T extends WorkflowType> {
  // Unique step identifier
  name: string
  // Step implementation (receives and returns the same `TaskContext<T>`)
  run: (context: TaskContext<T>) => Promise<TaskContext<T>>
  // Whether to run this step for the current request
  enabled: boolean
  // Whether the workflow should await this step
  waitForCompletion: boolean
  // Error handling policy for this step
  onError: 'abort' | 'continue'
}
```

- **Steps and context**
  - Steps under `src/steps` take a `TaskContext<T>` as input and return the same context (possibly updated). Any data that needs to be shared across steps should live on the context (typically in `meta`), and each step should record its own status (`success`, `failed`, or `skipped`, with optional error) in the `steps` field before passing the updated context to the next step.

```ts
interface TaskContext<T extends WorkflowType> {
  // Unique ID for this task instance
  taskId: string
  // Optional user identifier
  userId?: string
  // Workflow type (for example, 'chat' or 'knowledge')
  workflow: T
  // Typed input for this workflow
  input: WorkflowIOMap[T]['input']
  // Typed output for this workflow
  output: WorkflowIOMap[T]['output']
  // Per-step execution status (success / failed / skipped, with optional error)
  steps: Record<string, { status: 'success' | 'failed' | 'skipped'; error?: string }>
  // Additional metadata attached during processing (shared data between steps)
  meta: Record<string, unknown>
}
```


### HOW TO RUN

#### Local

```bash
npm install
npm run dev
```

#### Docker

```bash
docker build -t llm_service .
docker run --env-file .env -p 8000:8000 llm_service
```
