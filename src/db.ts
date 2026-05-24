import Dexie, { Table } from 'dexie';
import { Project } from './types';

type DraftRecord = { id: string; project: Project; updatedAt: string };

class BriefDb extends Dexie {
  drafts!: Table<DraftRecord, string>;
  constructor() {
    super('ai-visual-brief-builder');
    this.version(1).stores({ drafts: 'id, updatedAt' });
  }
}

export const db = new BriefDb();

export async function saveDraft(project: Project) {
  await db.drafts.put({ id: project.id, project, updatedAt: new Date().toISOString() });
}

export async function loadLatestDraft(): Promise<Project | null> {
  const rows = await db.drafts.orderBy('updatedAt').reverse().limit(1).toArray();
  return normalizeProject(rows[0]?.project ?? null);
}

export async function loadAllDrafts(): Promise<Project[]> {
  const rows = await db.drafts.orderBy('updatedAt').reverse().toArray();
  return rows.map((r) => normalizeProject(r.project)).filter(Boolean) as Project[];
}

function normalizeProject(project: any): Project | null {
  if (!project) return null;
  if (Array.isArray(project.scenes) && project.activeSceneId) {
    return { ...project, scenes: project.scenes.map(normalizeScene) } as Project;
  }
  if (project.scene) {
    const scene = normalizeScene(project.scene);
    return {
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt ?? new Date().toISOString(),
      scenes: [scene],
      activeSceneId: scene.id,
    } as Project;
  }
  return null;
}

function normalizeScene(scene: any) {
  return {
    ...scene,
    promptPackages: scene.promptPackages || [],
    activePromptPackageId: scene.activePromptPackageId,
    revisionPrompts: scene.revisionPrompts || [],
  };
}
