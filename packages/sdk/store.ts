export type StoreRow = {
  id: string
  name: string
  author: string
  lane: string
  permissions: string[]
  version?: string
  installed?: string
  candidate?: string
  failed?: string
  recovery: boolean
  compatible: boolean
  development?: boolean
  progress?: number
  error?: string
}
export type StoreState = { rows: StoreRow[]; error?: string; loading: boolean }
export type Store = {
  loadCatalog(url: string): Promise<void>
  subscribe(cb: () => void): () => void
  snapshot(): StoreState
  refresh(): Promise<void>
  install(id: string): Promise<void>
  remove(id: string): Promise<void>
  retry(id: string): Promise<void>
  restore(id: string): Promise<void>
}
