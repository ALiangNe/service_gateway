// Basic environment variables
export const SERVICE_NAME = process.env.SERVICE_NAME ?? 'llm_service'
export const NODE_ENV = process.env.NODE_ENV ?? 'dev'

// Http Config
export const HTTP_PORT = Number(process.env.HTTP_PORT) ?? 8010
export const IP_WHITELIST = process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : []

// Redis Config
export const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1'
export const REDIS_PORT = Number(process.env.REDIS_PORT) ?? 6379
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? ''
export const REDIS_TASK_RESULT_TTL = Number(process.env.REDIS_TASK_RESULT_TTL) ?? 3600

// Vector Store Config
export const VECTOR_STORE = process.env.VECTOR_STORE ?? 'chroma'

// Chroma Config
export const CHROMA_HOST = process.env.CHROMA_HOST ?? '127.0.0.1'
export const CHROMA_PORT = Number(process.env.CHROMA_PORT) ?? 8000
export const CHROMA_TENANT = process.env.CHROMA_TENANT ?? 'llm_tenant'
export const CHROMA_DATABASE = process.env.CHROMA_DATABASE ?? 'llm_db'

// PostgreSQL Config
export const PG_HOST = process.env.PG_HOST ?? '127.0.0.1'
export const PG_PORT = Number(process.env.PG_PORT) ?? 5432
export const PG_USERNAME = process.env.PG_USERNAME ?? 'llm_user'
export const PG_PASSWORD = process.env.PG_PASSWORD ?? ''
export const PG_DATABASE = process.env.PG_DATABASE ?? 'llm_db'

// Manifest Config
export const MANIFEST_PATH = process.env.MANIFEST_PATH ?? ''

// LLM Config
export const LLM_MODEL = process.env.LLM_MODEL ?? ''
export const LLM_API_KEY = process.env.LLM_API_KEY ?? ''
export const LLM_BASE_URL = process.env.LLM_BASE_URL ?? ''
export const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT) ?? 30000

// Extraction Model Config
export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL ?? LLM_MODEL
export const EXTRACTION_MODEL_API_KEY = process.env.EXTRACTION_MODEL_API_KEY ?? LLM_API_KEY
export const EXTRACTION_MODEL_BASE_URL = process.env.EXTRACTION_MODEL_BASE_URL ?? LLM_BASE_URL

// Embedding Model Config
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? ''
export const EMBEDDING_MODEL_API_KEY = process.env.EMBEDDING_MODEL_API_KEY ?? ''
export const EMBEDDING_MODEL_BASE_URL = process.env.EMBEDDING_MODEL_BASE_URL ?? ''
export const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION) ?? 1024

// MCP Service Config
export const MCP_BASE_URL = process.env.MCP_BASE_URL ?? ''
export const MCP_ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN ?? ''
export const MCP_TIMEOUT = Number(process.env.MCP_TIMEOUT) ?? 30000

// Message List Config
export const MSG_LIST_LISTEN = process.env.MSG_LIST_LISTEN ? process.env.MSG_LIST_LISTEN.split(',') : []

// Chat Task Config
export const CHAT_TEMPERATURE = Number(process.env.CHAT_TEMPERATURE) ?? 0.4
export const CHAT_HISTORY_MAX_LENGTH = Number(process.env.CHAT_HISTORY_MAX_LENGTH) ?? 20
export const RAG_TOPK = Number(process.env.RAG_TOPK) ?? 5
export const RAG_DISTANCE_THRESHOLD = Number(process.env.RAG_DISTANCE_THRESHOLD) ?? 0.3
export const LTM_TOPK = Number(process.env.LTM_TOPK) ?? 5
export const LTM_DISTANCE_THRESHOLD = Number(process.env.LTM_DISTANCE_THRESHOLD) ?? 0.3
export const TOPIC_TOPK = Number(process.env.TOPIC_TOPK) ?? 5
export const TOPIC_DISTANCE_THRESHOLD = Number(process.env.TOPIC_DISTANCE_THRESHOLD) ?? 0.3
export const MCP_MAX_ITERATIONS = Number(process.env.MCP_MAX_ITERATIONS) ?? 5
export const LTM_MERGE_DISTANCE_THRESHOLD = Number(process.env.LTM_MERGE_DISTANCE_THRESHOLD) ?? 0.08
