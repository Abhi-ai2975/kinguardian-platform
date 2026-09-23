/**
 * /folders — Server-side folder management demo.
 *
 * Shows filenestServer().folders.ensurePath(), getByPath(), and list()
 * running in an async RSC. No client JS needed.
 */

import { filenestServer } from "@filenest/nextjs/server";
import { CodeBlock } from "@/components/CodeBlock";

const SOURCE = `import { filenestServer } from "@filenest/nextjs/server";

const fn = filenestServer({
  apiKey: process.env.FILENEST_API_KEY!,
  projectId: process.env.FILENEST_PROJECT_ID!,
  baseUrl: process.env.FILENEST_API_URL,
});

export default async function FoldersPage() {
  // Idempotent — creates missing segments, returns leaf folder
  const folder = await fn.folders.ensurePath("demos/server-side");

  // Resolve a path to its folder record
  const resolved = await fn.folders.getByPath("demos/server-side");

  // List all folders in the project
  const { items: allFolders } = await fn.folders.list();

  // List files inside a specific folder
  const { items: files } = await fn.folders.listFiles(folder.id, { limit: 10 });

  return <pre>{JSON.stringify({ folder, resolved, allFolders, files }, null, 2)}</pre>;
}`;

export default async function FoldersPage() {
  const fn = filenestServer({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    baseUrl: process.env.FILENEST_API_URL,
  });

  type FolderItem = { id: string; name: string; path: string; file_count?: number };
  type FileItem = { id: string; filename: string; size_bytes: number; status: string };

  let ensuredFolder: FolderItem | null = null;
  let resolvedFolder: FolderItem | null = null;
  let allFolders: FolderItem[] = [];
  let filesInFolder: FileItem[] = [];
  let errorMsg = "";

  try {
    ensuredFolder = await fn.folders.ensurePath("demos/server-side") as FolderItem;
    resolvedFolder = await fn.folders.getByPath("demos/server-side") as FolderItem | null;
    const listResult = await fn.folders.list() as { items: FolderItem[] };
    allFolders = listResult.items;
    if (ensuredFolder) {
      const filesResult = await fn.folders.listFiles(ensuredFolder.id, { limit: 10 }) as { items: FileItem[] };
      filesInFolder = filesResult.items;
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Failed to fetch folders";
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="page-title" style={{ margin: 0 }}>Folder Management</h1>
          <span className="badge badge-blue">@filenest/nextjs/server</span>
        </div>
        <p className="page-sub">
          Server-side folder operations using <code>filenestServer().folders</code>.
          Demonstrates <code>ensurePath</code>, <code>getByPath</code>, <code>list</code>, and <code>listFiles</code> —
          all running in an async RSC with no client JavaScript.
        </p>
      </div>

      <div className="demo-split">
        <div className="flex flex-col gap-3">
          {errorMsg ? (
            <div className="card">
              <div className="card-body">
                <div className="badge badge-red" style={{ marginBottom: 8 }}>Error</div>
                <p className="text-sm text-muted">{errorMsg}</p>
                <p className="text-sm text-muted mt-2">Make sure your API key and project ID are set in <code>.env.local</code></p>
              </div>
            </div>
          ) : (
            <>
              {/* ensurePath result */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">ensurePath("demos/server-side")</div>
                  <div className="card-desc">
                    Creates the full path hierarchy if it doesn't exist. Safe to call on every request.
                  </div>
                </div>
                <div className="card-body">
                  {ensuredFolder ? (
                    <pre className="code-block" style={{ fontSize: 11, margin: 0 }}>
                      {JSON.stringify(ensuredFolder, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted">No result</p>
                  )}
                </div>
              </div>

              {/* getByPath result */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">getByPath("demos/server-side")</div>
                  <div className="card-desc">Resolves a path string to an existing folder. Returns null if not found.</div>
                </div>
                <div className="card-body">
                  <pre className="code-block" style={{ fontSize: 11, margin: 0 }}>
                    {JSON.stringify(resolvedFolder, null, 2)}
                  </pre>
                </div>
              </div>

              {/* All folders */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">folders.list()</div>
                  <div className="card-desc">{allFolders.length} folder{allFolders.length !== 1 ? "s" : ""} in this project</div>
                </div>
                {allFolders.length === 0 ? (
                  <div className="card-body text-sm text-muted">No folders yet.</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Path</th>
                        <th>Name</th>
                        <th>Files</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFolders.map((f) => (
                        <tr key={f.id}>
                          <td className="font-mono text-sm">{f.path}</td>
                          <td>{f.name}</td>
                          <td className="text-muted">{f.file_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Files inside the ensured folder */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">folders.listFiles(folder.id)</div>
                  <div className="card-desc">Files inside the "demos/server-side" folder</div>
                </div>
                {filesInFolder.length === 0 ? (
                  <div className="card-body text-sm text-muted">No files in this folder yet. Upload a file with folder_path set to "demos/server-side".</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Size</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filesInFolder.map((f) => (
                        <tr key={f.id}>
                          <td>{f.filename}</td>
                          <td className="text-muted">{(f.size_bytes / 1024).toFixed(1)} KB</td>
                          <td><span className="badge badge-green">{f.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>

        <CodeBlock title="app/folders/page.tsx" code={SOURCE} />
      </div>
    </div>
  );
}
