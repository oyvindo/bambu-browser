import { directoryEntries } from "./fs-dir-entries";
import { listUserAccountFolderNames } from "./profile-fs-access";
import type { ProfileKind } from "./resolver";

/** User filament presets in `filament/` vs full copies in `filament/base/`. Null for process profiles. */
export type FilamentCategory = "standard" | "custom";

export type UserProfileEntry = {
  userId: string;
  kind: ProfileKind;
  /** Logical path for the resolver, e.g. users/name/process/foo.json or user/123/process/foo.json */
  relativePath: string;
  fileName: string;
  /** Set when `kind === "filament"`: standard presets vs custom base copies. */
  filamentCategory?: FilamentCategory | null;
};

/**
 * Profiles for one account folder under `.../BambuStudio/users/<username>/`.
 */
export async function listProfileEntriesForUser(
  usersDir: FileSystemDirectoryHandle,
  username: string,
): Promise<UserProfileEntry[]> {
  const out: UserProfileEntry[] = [];
  let userDir: FileSystemDirectoryHandle;
  try {
    userDir = await usersDir.getDirectoryHandle(username);
  } catch {
    return out;
  }

  for (const sub of ["process", "filament"] as const) {
    try {
      const subDir = await userDir.getDirectoryHandle(sub);
      const kind: ProfileKind = sub === "filament" ? "filament" : "process";
      for await (const [fileName, fh] of directoryEntries(subDir)) {
        if (fh.kind !== "file") continue;
        if (!fileName.toLowerCase().endsWith(".json")) continue;
        out.push({
          userId: username,
          kind,
          relativePath: `users/${username}/${sub}/${fileName}`,
          fileName,
          ...(kind === "filament"
            ? { filamentCategory: "standard" as const }
            : {}),
        });
      }
      if (sub === "filament") {
        try {
          const baseDir = await subDir.getDirectoryHandle("base");
          for await (const [fileName, fh] of directoryEntries(baseDir)) {
            if (fh.kind !== "file") continue;
            if (!fileName.toLowerCase().endsWith(".json")) continue;
            out.push({
              userId: username,
              kind: "filament",
              relativePath: `users/${username}/filament/base/${fileName}`,
              fileName,
              filamentCategory: "custom",
            });
          }
        } catch {
          // no filament/base
        }
      }
    } catch {
      // folder missing
    }
  }

  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * All profiles under a full BambuStudio root: prefers `users/` (named accounts), else legacy `user/<id>/`.
 */
export async function listUserProfileEntriesFromStudioRoot(
  root: FileSystemDirectoryHandle,
): Promise<UserProfileEntry[]> {
  try {
    const users = await root.getDirectoryHandle("users");
    const names = await listUserAccountFolderNames(users);
    const out: UserProfileEntry[] = [];
    for (const name of names) {
      out.push(...(await listProfileEntriesForUser(users, name)));
    }
    if (out.length > 0)
      return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  } catch {
    // no users/
  }

  return listLegacyUserFolderProfiles(root);
}

async function listLegacyUserFolderProfiles(
  root: FileSystemDirectoryHandle,
): Promise<UserProfileEntry[]> {
  const out: UserProfileEntry[] = [];
  let userRoot: FileSystemDirectoryHandle;
  try {
    userRoot = await root.getDirectoryHandle("user");
  } catch {
    return out;
  }

  for await (const [userId, handle] of directoryEntries(userRoot)) {
    if (handle.kind !== "directory") continue;
    const userDir = handle as FileSystemDirectoryHandle;

    for (const sub of ["process", "filament"] as const) {
      try {
        const subDir = await userDir.getDirectoryHandle(sub);
        const kind: ProfileKind = sub === "filament" ? "filament" : "process";
        for await (const [fileName, fh] of directoryEntries(subDir)) {
          if (fh.kind !== "file") continue;
          if (!fileName.toLowerCase().endsWith(".json")) continue;
          out.push({
            userId,
            kind,
            relativePath: `user/${userId}/${sub}/${fileName}`,
            fileName,
            ...(kind === "filament"
              ? { filamentCategory: "standard" as const }
              : {}),
          });
        }
        if (sub === "filament") {
          try {
            const baseDir = await subDir.getDirectoryHandle("base");
            for await (const [fileName, fh] of directoryEntries(baseDir)) {
              if (fh.kind !== "file") continue;
              if (!fileName.toLowerCase().endsWith(".json")) continue;
              out.push({
                userId,
                kind: "filament",
                relativePath: `user/${userId}/filament/base/${fileName}`,
                fileName,
                filamentCategory: "custom",
              });
            }
          } catch {
            // no filament/base
          }
        }
      } catch {
        // folder missing
      }
    }
  }

  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
