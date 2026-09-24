"use client"

import { LockIcon } from "lucide-react"
import type * as React from "react"

import { ChangeRequestList } from "@/components/ficha/change-request-list"
import { CommentThread } from "@/components/ficha/comment-thread"
import { ReadProgress } from "@/components/ficha/read-progress"
import { SignatureTimeline } from "@/components/ficha/signature-timeline"
import { VersionTable } from "@/components/ficha/version-table"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DocumentDetail, DocumentVersion, ReviewComment } from "@/lib/types"

interface FichaTabsProps {
  doc: DocumentDetail
  version: DocumentVersion
  canComment: boolean
  /** Admin solo metadatos: no ve los comentarios de revisión. */
  contentHidden: boolean
  author: ReviewComment["author"]
  hrefFor: (versionNo: number) => string
  onCommentAdded: (c: ReviewComment) => void
  onCommentResolved: (id: string, at: string) => void
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-superficie-alt px-1.5 text-caption text-texto-sec">{children}</span>
}

const TRIGGER =
  "h-11 flex-none rounded-none border-0 border-b-2 border-transparent px-3 text-body text-texto-sec after:hidden hover:text-texto data-active:border-acento data-active:bg-transparent data-active:text-acento data-active:shadow-none"

/** Pestañas de la ficha. En móvil se desplazan en horizontal. */
export function FichaTabs({ doc, version, canComment, contentHidden, author, hrefFor, onCommentAdded, onCommentResolved }: FichaTabsProps) {
  const confirmed = version.reads.filter((r) => r.acknowledgedAt !== null).length
  return (
    <Card>
      <Tabs defaultValue="comentarios" className="gap-0">
        <TabsList
          variant="line"
          aria-label="Información de la versión"
          className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-borde p-0 px-2 md:px-4"
        >
          <TabsTrigger value="comentarios" className={TRIGGER}>
            Comentarios {!contentHidden && <Count>{version.comments.length}</Count>}
          </TabsTrigger>
          <TabsTrigger value="versiones" className={TRIGGER}>
            Versiones <Count>{doc.versions.length}</Count>
          </TabsTrigger>
          <TabsTrigger value="firmas" className={TRIGGER}>
            Firmas <Count>{version.signatures.length}</Count>
          </TabsTrigger>
          <TabsTrigger value="lecturas" className={TRIGGER}>
            Lecturas{doc.readRequired && version.reads.length > 0 && <Count>{`${confirmed}/${version.reads.length}`}</Count>}
          </TabsTrigger>
          <TabsTrigger value="solicitudes" className={TRIGGER}>
            Solicitudes <Count>{doc.changeRequests.length}</Count>
          </TabsTrigger>
        </TabsList>
        <div className="p-4 md:p-6">
          <TabsContent value="comentarios">
            {contentHidden ? (
              <EmptyState
                icon={LockIcon}
                title="Tu rol de administrador no permite ver los comentarios de revisión."
                description="Los comentarios describen el contenido del documento."
                className="py-8"
              />
            ) : (
              <CommentThread
                key={version.id}
                versionId={version.id}
                comments={version.comments}
                canWrite={canComment}
                author={author}
                onAdded={onCommentAdded}
                onResolved={onCommentResolved}
              />
            )}
          </TabsContent>
          <TabsContent value="versiones">
            <VersionTable versions={doc.versions} selectedNo={version.versionNo} hrefFor={hrefFor} />
          </TabsContent>
          <TabsContent value="firmas">
            <SignatureTimeline signatures={version.signatures} />
          </TabsContent>
          <TabsContent value="lecturas">
            <ReadProgress readRequired={doc.readRequired} reads={version.reads} />
          </TabsContent>
          <TabsContent value="solicitudes">
            <ChangeRequestList requests={doc.changeRequests} />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  )
}
