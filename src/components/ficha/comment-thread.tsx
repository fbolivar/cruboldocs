"use client"

import { CheckIcon, MessageSquareIcon } from "lucide-react"
import { type FormEvent, useId, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { addComment, resolveComment } from "@/lib/data/actions"
import { formatDateTime } from "@/lib/format"
import type { ReviewComment } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CommentThreadProps {
  versionId: string
  comments: ReviewComment[]
  /** Revisor en En revisión o elaborador para responder. */
  canWrite: boolean
  onAdded: (comment: ReviewComment) => void
  onResolved: (commentId: string, at: string) => void
  author: ReviewComment["author"]
}

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")

/** Hilo de comentarios de la versión mostrada. Los resueltos se atenúan y llevan badge. */
export function CommentThread({ versionId, comments, canWrite, onAdded, onResolved, author }: CommentThreadProps) {
  const id = useId()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await addComment(versionId, body)
    setPending(false)
    if (!res.ok) return setError(res.error)
    onAdded({ id: res.data.id, author, body: body.trim(), createdAt: res.data.at, resolvedAt: null })
    setBody("")
    setError(null)
    toast.success("Comentario publicado")
  }

  async function resolve(commentId: string) {
    setResolving(commentId)
    const res = await resolveComment(commentId)
    setResolving(null)
    if (!res.ok) return void toast.error(res.error)
    onResolved(commentId, res.data.at)
  }

  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? (
        <EmptyState icon={MessageSquareIcon} title="Sin comentarios en esta versión." className="py-8" />
      ) : (
        <ol className="flex flex-col">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 border-t border-borde py-4 first:border-t-0 first:pt-0">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alt text-caption text-texto-sec",
                  c.resolvedAt && "opacity-60"
                )}
              >
                {initials(c.author.fullName)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-small", c.resolvedAt && "opacity-60")}>
                    <span className="font-medium">{c.author.fullName}</span>{" "}
                    <span className="text-texto-sec">
                      · {c.author.positionName} · {formatDateTime(c.createdAt)}
                    </span>
                  </p>
                  {c.resolvedAt ? (
                    <Badge tone="exito" icon={<CheckIcon aria-hidden="true" />}>
                      Resuelto
                    </Badge>
                  ) : (
                    canWrite && (
                      <Button variant="ghost" size="sm" className="-mt-2 md:mt-0" loading={resolving === c.id} onClick={() => resolve(c.id)}>
                        Marcar resuelto
                      </Button>
                    )
                  )}
                </div>
                <p className={cn("text-body-lg", c.resolvedAt && "opacity-60")}>{c.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {canWrite && (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t border-borde pt-4">
          <Field id={`${id}-nuevo`} label="Nuevo comentario" error={error}>
            {(aria) => <Textarea {...aria} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />}
          </Field>
          <Button type="submit" variant="outline" className="w-full md:w-auto md:self-end" loading={pending}>
            Comentar
          </Button>
        </form>
      )}
    </div>
  )
}
