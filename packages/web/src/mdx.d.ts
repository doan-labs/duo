declare module '*.mdx' {
  import type { ComponentType } from 'react'
  export const meta: import('./blog/posts').Meta
  const Post: ComponentType<{ components?: Record<string, ComponentType<never>> }>
  export default Post
}
