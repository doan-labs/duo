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
/** `source` names the catalog the rows came from: the Duo catalog, or a developer catalog URL. */
export type StoreState = { rows: StoreRow[]; error?: string; loading: boolean; source: string; developer: boolean }
export type Store = {
  loadCatalog(url: string): Promise<void>
  /** Leave a developer catalog and reload the default Duo catalog. */
  resetCatalog(): Promise<void>
  subscribe(cb: () => void): () => void
  snapshot(): StoreState
  refresh(): Promise<void>
  install(id: string): Promise<void>
  remove(id: string): Promise<void>
  retry(id: string): Promise<void>
  restore(id: string): Promise<void>
}
