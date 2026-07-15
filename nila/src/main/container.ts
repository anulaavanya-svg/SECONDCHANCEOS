/**
 * Composition root. Instantiates every service once and exposes them as a
 * single container passed to the IPC layer. This keeps wiring in one place and
 * avoids scattering singletons across the codebase.
 */
import type { BrowserWindow } from 'electron'
import { Config } from './services/config'
import { Database } from './services/database'
import { MemoryStore } from './services/memory-store'
import { FileService } from './services/files'
import { ScreenshotService } from './services/screenshot'
import { ResearchService } from './services/research'
import { AnthropicClientProvider } from './services/anthropic-client'
import { AnthropicService, type TurnFlags } from './services/anthropic'
import { ToolRegistry, type ToolContext } from './services/tools'
import { AgentRunner } from './agents/agent-runner'
import { Orchestrator } from './agents/orchestrator'
import { AutomationExecutor } from './automation/executor'
import { AutomationManager } from './automation/manager'
import { configureLogger, createLogger } from './services/logger'

const log = createLogger('container')

export interface Services {
  config: Config
  db: Database
  memory: MemoryStore
  files: FileService
  screenshot: ScreenshotService
  research: ResearchService
  clients: AnthropicClientProvider
  chat: AnthropicService
  tools: ToolRegistry
  orchestrator: Orchestrator
  automation: AutomationManager
}

export function createServices(getWindow: () => BrowserWindow | null): Services {
  const config = new Config()
  configureLogger({ file: config.getLogPath() })
  log.info('starting Nila, data dir:', config.getDataDir())

  const db = new Database(config.getDatabasePath())
  const memory = new MemoryStore(db)
  const files = new FileService(config)
  const screenshot = new ScreenshotService()
  const clients = new AnthropicClientProvider(config)
  const research = new ResearchService(clients)
  const tools = new ToolRegistry()

  const executor = new AutomationExecutor(files)
  const automation = new AutomationManager(db, config, executor, getWindow)

  // Orchestration layer: Nila Core delegates to specialized agents through this.
  const agentRunner = new AgentRunner(clients, tools)
  const orchestrator = new Orchestrator(tools, agentRunner)

  const makeToolContext = (conversationId: string, flags: TurnFlags): ToolContext => ({
    conversationId,
    db,
    files,
    memory,
    research,
    screenshot,
    automation,
    flags
  })

  const chat = new AnthropicService({ config, db, memory, clients, orchestrator, makeToolContext })

  return {
    config,
    db,
    memory,
    files,
    screenshot,
    research,
    clients,
    chat,
    tools,
    orchestrator,
    automation
  }
}
