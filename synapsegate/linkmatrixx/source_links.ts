export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private links = new Map<string, InputLink>()

  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    this.links.set(link.id, link)
    return { success: true, link }
  }

  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link }
  }

  list(): InputLink[] {
    return Array.from(this.links.values())
  }

  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  /**
   * Update metadata for an existing link.
   */
  updateMetadata(id: string, metadata: Record<string, any>): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    const updated: InputLink = { ...link, metadata: { ...link.metadata, ...metadata } }
    this.links.set(id, updated)
    return { success: true, link: updated }
  }

  /**
   * Find links by source identifier.
   */
  findBySource(source: string): InputLink[] {
    return Array.from(this.links.values()).filter(l => l.source === source)
  }

  /**
   * Search by URL substring.
   */
  searchByUrl(query: string): InputLink[] {
    return Array.from(this.links.values()).filter(l => l.url.includes(query))
  }

  /**
   * Export all links as a plain object.
   */
  toObject(): Record<string, InputLink> {
    const obj: Record<string, InputLink> = {}
    for (const [k, v] of this.links.entries()) {
      obj[k] = v
    }
    return obj
  }

  /**
   * Import multiple links at once, skipping duplicates.
   */
  import(links: InputLink[]): void {
    for (const l of links) {
      if (!this.links.has(l.id)) {
        this.links.set(l.id, l)
      }
    }
  }

  /**
   * Clear all registered links.
   */
  clear(): void {
    this.links.clear()
  }
}
