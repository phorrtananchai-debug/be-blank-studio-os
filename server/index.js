/* eslint-env node */
import cors from 'cors';
import express from 'express';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const dataFile = path.join(dataDir, 'studio-os.json');
const port = 8787;
let firebaseState;

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await access(dataFile);
  } catch {
    await writeStudioData({
      projects: [],
      contentPosts: [],
      portfolioItems: [],
    });
  }
}

async function readStudioData() {
  await ensureDataFile();
  const rawData = await readFile(dataFile, 'utf8');
  const data = JSON.parse(rawData);

  return {
    projects: Array.isArray(data.projects) ? data.projects : [],
    contentPosts: Array.isArray(data.contentPosts) ? data.contentPosts : [],
    portfolioItems: Array.isArray(data.portfolioItems) ? data.portfolioItems : [],
  };
}

async function writeStudioData(data) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function createId() {
  return `project-${crypto.randomUUID()}`;
}

function normalizeProject(input = {}, existing = {}) {
  const project = {
    ...existing,
    ...input,
  };

  if (!project.id) {
    project.id = createId();
  }

  if (project.blocker && !project.blockers) {
    project.blockers = project.blocker;
  }

  if (project.blockers && !project.blocker) {
    project.blocker = project.blockers;
  }

  return project;
}

function normalizeName(value = '') {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function getAgentText(input) {
  return typeof input === 'string' ? input : input?.input || input?.command || input?.text || '';
}

function getAgentIntent(input) {
  if (input?.action === 'create_project') {
    return 'create';
  }

  if (input?.action === 'update_project') {
    return 'update';
  }

  const text = getAgentText(input).toLowerCase();
  const updateWords = ['อัปเดต', 'อัพเดต', 'แก้', 'เพิ่ม', 'update', 'edit'];
  const createWords = ['สร้าง', 'create', 'new project'];

  if (updateWords.some((word) => text.includes(word))) {
    return 'update';
  }

  if (createWords.some((word) => text.includes(word))) {
    return 'create';
  }

  return 'unknown';
}

function getKeyedValues(text) {
  const values = {};
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex > 0) {
      const key = part.slice(0, separatorIndex).trim().toLowerCase().replace(/\s+/g, '');
      values[key] = part.slice(separatorIndex + 1).trim();
    }
  }

  return values;
}

function extractProjectName(input) {
  if (input?.project?.name) {
    return input.project.name;
  }

  if (input?.payload?.name) {
    return input.payload.name;
  }

  if (input?.name) {
    return input.name;
  }

  const text = getAgentText(input);
  const keyedValues = getKeyedValues(text);

  if (keyedValues.name || keyedValues.project || keyedValues.projectname) {
    return keyedValues.name || keyedValues.project || keyedValues.projectname;
  }

  const cleanedText = text
    .replace(/อัปเดต|อัพเดต|แก้|เพิ่ม|สร้าง|update|edit|create|new project/giu, '')
    .trim();
  const firstPart = cleanedText.split(',')[0] || '';
  const nameOnly = firstPart
    .replace(/\b(client|location|status|deadline|notes|next action|blocker|risk)\b.*$/iu, '')
    .trim();

  return nameOnly || firstPart.trim();
}

function parseAgentUpdates(input) {
  if (input?.project && typeof input.project === 'object') {
    return { ...input.project };
  }

  if (input?.payload && typeof input.payload === 'object') {
    return { ...input.payload };
  }

  if (input && typeof input === 'object' && !input.input && !input.command && !input.text) {
    return { ...input };
  }

  const text = getAgentText(input);
  const keyedValues = getKeyedValues(text);
  const updates = {};

  const fieldMap = {
    name: 'name',
    project: 'name',
    projectname: 'name',
    client: 'client',
    location: 'location',
    status: 'status',
    deadline: 'openingDate',
    openingdate: 'openingDate',
    handover: 'handoverDate',
    handoverdate: 'handoverDate',
    start: 'startDate',
    startdate: 'startDate',
    notes: 'notes',
    note: 'notes',
    nextaction: 'nextAction',
    blocker: 'blocker',
    blockers: 'blockers',
    risk: 'riskLevel',
    risklevel: 'riskLevel',
    areasqm: 'areaSqm',
    area: 'areaSqm',
    ratepersqm: 'ratePerSqm',
    rate: 'ratePerSqm',
    projectvalue: 'projectValue',
    targetcost: 'targetCost',
    actualcost: 'actualCost',
  };

  for (const [key, value] of Object.entries(keyedValues)) {
    const mappedField = fieldMap[key];
    if (mappedField && value) {
      updates[mappedField] = value;
    }
  }

  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (Object.keys(updates).length === 0) {
    const [, client = '', deadline = '', ...notes] = parts;

    if (client) {
      updates.client = client;
    }
    if (deadline) {
      updates.openingDate = deadline;
    }
    if (notes.length > 0) {
      updates.notes = notes.join(', ');
    }
  }

  if (updates.blocker && !updates.blockers) {
    updates.blockers = updates.blocker;
  }

  if (updates.blockers && !updates.blocker) {
    updates.blocker = updates.blockers;
  }

  return updates;
}

function parseAgentProject(input) {
  if (input?.project && typeof input.project === 'object') {
    return normalizeProject(input.project);
  }

  if (input?.payload && typeof input.payload === 'object') {
    return normalizeProject(input.payload);
  }

  if (input && typeof input === 'object' && !input.input && !input.command && !input.text) {
    return normalizeProject(input);
  }

  const text = typeof input === 'string' ? input : input?.input || input?.command || input?.text || '';
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const keyedValues = {};

  for (const part of parts) {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex > 0) {
      const key = part.slice(0, separatorIndex).trim().toLowerCase().replace(/\s+/g, '');
      keyedValues[key] = part.slice(separatorIndex + 1).trim();
    }
  }

  if (Object.keys(keyedValues).length > 0) {
    return normalizeProject({
      name: keyedValues.name || keyedValues.project || keyedValues.projectname || 'Untitled Project',
      client: keyedValues.client || '',
      location: keyedValues.location || '',
      status: keyedValues.status || 'concept',
      openingDate: keyedValues.deadline || keyedValues.openingdate || '',
      handoverDate: keyedValues.handover || keyedValues.handoverdate || '',
      startDate: keyedValues.start || keyedValues.startdate || '',
      notes: keyedValues.notes || '',
      nextAction: keyedValues.nextaction || '',
      blocker: keyedValues.blocker || '',
      riskLevel: keyedValues.risk || keyedValues.risklevel || 'Low',
      areaSqm: keyedValues.areasqm || keyedValues.area || '',
      ratePerSqm: keyedValues.ratepersqm || keyedValues.rate || '',
      projectValue: keyedValues.projectvalue || '',
      targetCost: keyedValues.targetcost || '',
      actualCost: keyedValues.actualcost || '',
    });
  }

  const [rawName = 'Untitled Project', client = '', deadline = '', ...notes] = parts;
  const name =
    rawName.replace(/สร้าง|create|new project/giu, '').trim() ||
    rawName;

  return normalizeProject({
    name,
    client,
    openingDate: deadline,
    status: 'concept',
    notes: notes.join(', '),
    riskLevel: 'Low',
  });
}

function findProjectByName(projects, name) {
  const normalizedTarget = normalizeName(name);

  if (!normalizedTarget) {
    return null;
  }

  return (
    projects.find((project) => normalizeName(project.name) === normalizedTarget) ||
    projects.find((project) => {
      const normalizedProjectName = normalizeName(project.name);
      return normalizedProjectName.includes(normalizedTarget) || normalizedTarget.includes(normalizedProjectName);
    }) ||
    null
  );
}

async function getFirebaseAdmin() {
  if (firebaseState !== undefined) {
    return firebaseState;
  }

  const hasServiceAccountJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasApplicationCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!hasServiceAccountJson && !hasApplicationCredentials) {
    firebaseState = null;
    return firebaseState;
  }

  try {
    const appModule = await import('firebase-admin/app');
    const firestoreModule = await import('firebase-admin/firestore');
    const app =
      appModule.getApps()[0] ||
      appModule.initializeApp({
        credential: hasServiceAccountJson
          ? appModule.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
          : appModule.applicationDefault(),
      });

    firebaseState = {
      db: firestoreModule.getFirestore(app),
      FieldValue: firestoreModule.FieldValue,
    };
  } catch (error) {
    console.warn(`Firebase Admin unavailable, using local JSON fallback: ${error.message}`);
    firebaseState = null;
  }

  return firebaseState;
}

async function createProjectLocal(project) {
  const data = await readStudioData();
  data.projects = [project, ...data.projects];
  await writeStudioData(data);
  return project;
}

async function updateProjectLocal(id, updates) {
  const data = await readStudioData();
  const index = data.projects.findIndex((project) => project.id === id);

  if (index === -1) {
    return null;
  }

  const project = normalizeProject(updates, data.projects[index]);
  data.projects[index] = project;
  await writeStudioData(data);
  return project;
}

async function getProjectsWithPreferredStorage() {
  const firebase = await getFirebaseAdmin();

  if (firebase) {
    const snapshot = await firebase.db.collection('projects').get();
    return {
      storage: 'firebase',
      projects: snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      })),
    };
  }

  const data = await readStudioData();
  return {
    storage: 'local',
    projects: data.projects,
  };
}

async function createProjectWithPreferredStorage(project) {
  const firebase = await getFirebaseAdmin();

  if (firebase) {
    await firebase.db
      .collection('projects')
      .doc(project.id)
      .set({
        ...project,
        createdAt: firebase.FieldValue.serverTimestamp(),
        updatedAt: firebase.FieldValue.serverTimestamp(),
      });

    return { project, storage: 'firebase' };
  }

  return { project: await createProjectLocal(project), storage: 'local' };
}

async function updateProjectWithPreferredStorage(id, updates) {
  const firebase = await getFirebaseAdmin();

  if (firebase) {
    const project = normalizeProject(updates, { id });
    await firebase.db
      .collection('projects')
      .doc(id)
      .set(
        {
          ...updates,
          blocker: updates.blocker || updates.blockers || '',
          blockers: updates.blockers || updates.blocker || '',
          updatedAt: firebase.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return { project, storage: 'firebase' };
  }

  return { project: await updateProjectLocal(id, updates), storage: 'local' };
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'Be Blank Studio OS Local API',
    storage: dataFile,
  });
});

app.get('/api/studio-os', async (_request, response, next) => {
  try {
    const data = await readStudioData();
    response.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/projects', async (_request, response, next) => {
  try {
    const data = await readStudioData();
    response.json(data.projects);
  } catch (error) {
    next(error);
  }
});

app.post('/api/projects', async (request, response, next) => {
  try {
    const project = normalizeProject(request.body);
    response.status(201).json(await createProjectLocal(project));
  } catch (error) {
    next(error);
  }
});

app.post('/api/agent/create-project', async (request, response, next) => {
  try {
    const intent = getAgentIntent(request.body);
    const projectName = extractProjectName(request.body);
    const source = await getProjectsWithPreferredStorage();
    const existingProject = findProjectByName(source.projects, projectName);

    if (existingProject) {
      const updates = parseAgentUpdates(request.body);
      const result = await updateProjectWithPreferredStorage(existingProject.id, updates);
      if (request.body?.action) {
        console.log('Agent executed from ChatGPT command');
      }
      response.json({
        action: 'update',
        project: result.project || { ...existingProject, ...updates },
        storage: result.storage,
        matchedProject: existingProject.name,
      });
      return;
    }

    if (intent === 'update') {
      response.status(404).json({
        error: `Project not found for update: ${projectName || 'unknown project'}`,
        action: 'update',
      });
      return;
    }

    if (intent !== 'create') {
      response.status(400).json({
        error: 'No project created. Use "create", "new project", or "สร้าง" for new projects, or include an existing project name for updates.',
        action: 'none',
      });
      return;
    }

    const project = parseAgentProject(request.body);
    const duplicateProject = findProjectByName(source.projects, project.name);

    if (duplicateProject) {
      const result = await updateProjectWithPreferredStorage(duplicateProject.id, parseAgentUpdates(request.body));
      if (request.body?.action) {
        console.log('Agent executed from ChatGPT command');
      }
      response.json({
        action: 'update',
        project: result.project || duplicateProject,
        storage: result.storage,
        matchedProject: duplicateProject.name,
      });
      return;
    }

    const result = await createProjectWithPreferredStorage(project);
    if (request.body?.action) {
      console.log('Agent executed from ChatGPT command');
    }
    response.status(201).json({
      action: 'create',
      project: result.project,
      storage: result.storage,
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/projects/:id', async (request, response, next) => {
  try {
    const data = await readStudioData();
    const index = data.projects.findIndex((project) => project.id === request.params.id);

    if (index === -1) {
      response.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = normalizeProject(request.body, data.projects[index]);
    data.projects[index] = project;
    await writeStudioData(data);
    response.json(project);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/projects/:id', async (request, response, next) => {
  try {
    const data = await readStudioData();
    const nextProjects = data.projects.filter((project) => project.id !== request.params.id);

    if (nextProjects.length === data.projects.length) {
      response.status(404).json({ error: 'Project not found' });
      return;
    }

    data.projects = nextProjects;
    await writeStudioData(data);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, next) => {
  void next;
  response.status(500).json({
    error: error.message || 'Local API error',
  });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Be Blank Studio OS Local API running at http://127.0.0.1:${port}`);
});
