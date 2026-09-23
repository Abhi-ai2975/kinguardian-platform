/**
 * RecentFilesList — last 10 files uploaded across all projects.
 *
 * Purely presentational. Each row links to the file's project files page.
 * Status is shown as a coloured badge matching the lifecycle state.
 *
 * @module
 */
import Link from "next/link";
import { FileText, Image, Video, Music, Archive, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TRecentFile } from "@/modules/entities/schemas/dashboard";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "default",
  processing: "secondary",
  failed: "destructive",
  quarantined: "destructive",
  pending: "outline",
};

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <Image className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return <Video className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext))
    return <Music className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext))
    return <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext))
    return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface RecentFilesListProps {
  files: TRecentFile[];
}

export function RecentFilesList({ files }: RecentFilesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent files</CardTitle>
        <CardDescription>Last 10 files uploaded across all projects</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No files uploaded yet.
          </p>
        ) : (
          <ul className="divide-y">
            {files.map((file) => (
              <li key={file.id}>
                <Link
                  href={`/projects/${file.project_id}/files`}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  <FileIcon filename={file.filename} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.filename}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {file.project_name} · {formatBytes(file.size_bytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={STATUS_VARIANT[file.status] ?? "outline"}
                      className="text-xs capitalize"
                    >
                      {file.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {relativeTime(file.created_at)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
