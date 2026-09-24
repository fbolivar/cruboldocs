"use client"

import { FileTextIcon, SearchIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

import { DocumentStatusBadge } from "@/components/documentos/status-badge"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { searchDocumentsAction } from "@/lib/data/actions"
import type { DocumentSummary } from "@/lib/types"

function useDocumentSearch() {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<DocumentSummary[]>([])
  const [pending, startTransition] = useTransition()
  useEffect(() => {
    const term = q.trim()
    const t = setTimeout(() => {
      startTransition(async () => setResults(term ? await searchDocumentsAction(term) : []))
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  return { q, setQ, results, pending }
}

function Results({ q, results, pending, onPick }: { q: string; results: DocumentSummary[]; pending: boolean; onPick: (d: DocumentSummary) => void }) {
  return (
    <CommandList className="max-h-80">
      {q.trim() && !pending && <CommandEmpty>No encontramos documentos con “{q.trim()}”.</CommandEmpty>}
      {results.length > 0 && (
        <CommandGroup heading="Documentos">
          {results.map((d) => (
            <CommandItem key={d.id} value={d.id} onSelect={() => onPick(d)} className="gap-3 py-2">
              <FileTextIcon className="text-texto-sec" aria-hidden="true" />
              <span className="font-mono text-small">{d.code}</span>
              <span className="min-w-0 flex-1 truncate">{d.title}</span>
              <DocumentStatusBadge status={d.status} />
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </CommandList>
  )
}

/** Buscador global de documentos por código o título. Solo devuelve lo que RLS permite. */
export function GlobalSearch() {
  const router = useRouter()
  const { q, setQ, results, pending } = useDocumentSearch()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function pick(d: DocumentSummary) {
    setOpen(false)
    setQ("")
    router.push(`/app/documentos/${d.id}`)
  }

  return (
    <Command shouldFilter={false} className="w-80 overflow-visible bg-transparent p-0">
      <Popover open={open && q.trim().length > 0} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <label className="flex h-9 items-center gap-2 rounded-sm border border-borde-fuerte bg-superficie px-3 text-texto-sec focus-within:border-acento">
            <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Buscar documentos por código o título</span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              placeholder="Buscar código o título"
              className="min-w-0 flex-1 bg-transparent text-small text-texto outline-none placeholder:text-texto-sec"
              role="combobox"
              aria-expanded={open}
              aria-controls="busqueda-global"
            />
            <kbd className="font-mono text-caption tracking-normal">Ctrl K</kbd>
          </label>
        </PopoverAnchor>
        <PopoverContent
          id="busqueda-global"
          align="end"
          className="w-112 p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Results q={q} results={results} pending={pending} onPick={pick} />
        </PopoverContent>
      </Popover>
    </Command>
  )
}

/** Móvil: ícono que abre una capa a pantalla completa. */
export function MobileSearch() {
  const router = useRouter()
  const { q, setQ, results, pending } = useDocumentSearch()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center text-texto-sec" aria-label="Buscar documentos">
        <SearchIcon className="size-5" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start rounded-none p-0 sm:max-w-none">
          <DialogTitle className="sr-only">Buscar documentos</DialogTitle>
          <Command shouldFilter={false} className="rounded-none">
            <div className="flex items-center gap-2 border-b border-borde px-4">
              <SearchIcon className="size-5 text-texto-sec" aria-hidden="true" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar código o título"
                aria-label="Buscar documentos por código o título"
                className="h-14 min-w-0 flex-1 bg-transparent text-body outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center text-texto-sec" aria-label="Cerrar búsqueda">
                <XIcon className="size-5" aria-hidden="true" />
              </button>
            </div>
            <Results
              q={q}
              results={results}
              pending={pending}
              onPick={(d) => {
                setOpen(false)
                router.push(`/app/documentos/${d.id}`)
              }}
            />
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
