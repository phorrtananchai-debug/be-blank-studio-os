import admin from 'firebase-admin';
import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

admin.initializeApp();

const agentKey = defineSecret('AGENT_KEY');
const db = admin.firestore();
const agentApp = express();

agentApp.use(express.json({ limit: '1mb' }));

function normalizeName(value = '') {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

const projectFieldAliases = {
  deadline: 'handoverDate',
  dueDate: 'handoverDate',
  targetDate: 'handoverDate',
  projectName: 'name',
  title: 'name',
  ลูกค้า: 'client',
  สถานที่: 'location',
  ที่ตั้ง: 'location',
  สถานะ: 'status',
};

const statusAliases = {
  design: 'design',
  ดีไซน์: 'design',
  ออกแบบ: 'design',
  concept: 'concept',
  คอนเซปต์: 'concept',
  construction: 'construction',
  ก่อสร้าง: 'construction',
  handover: 'handover',
  ส่งมอบ: 'handover',
  open: 'open',
  เปิดร้าน: 'open',
};

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function normalizeStatus(status) {
  if (!hasValue(status)) {
    return status;
  }

  return statusAliases[String(status).trim().toLowerCase()] || status;
}

function applyProjectAliases(project = {}, source = {}) {
  const normalized = {
    ...project,
  };

  for (const [alias, field] of Object.entries(projectFieldAliases)) {
    if (!hasValue(normalized[field]) && hasValue(source[alias])) {
      normalized[field] = source[alias];
    }
  }

  if (!hasValue(normalized.name) && typeof source.project === 'string') {
    normalized.name = source.project;
  }

  if (hasValue(normalized.deadline) && !hasValue(normalized.handoverDate)) {
    normalized.handoverDate = normalized.deadline;
  }

  if (hasValue(normalized.status)) {
    normalized.status = normalizeStatus(normalized.status);
  }

  return normalized;
}

function normalizeProject(input = {}) {
  const payload =
    input.payload && typeof input.payload === 'object'
      ? input.payload
      : input.project && typeof input.project === 'object'
        ? input.project
        : input;

  const project = applyProjectAliases(
    {
      ...payload,
    },
    input,
  );

  const aliasedProject = applyProjectAliases(project, payload);

  if (aliasedProject.blocker && !aliasedProject.blockers) {
    aliasedProject.blockers = aliasedProject.blocker;
  }

  if (aliasedProject.blockers && !aliasedProject.blocker) {
    aliasedProject.blocker = aliasedProject.blockers;
  }

  for (const alias of Object.keys(projectFieldAliases)) {
    if (alias !== projectFieldAliases[alias]) {
      delete aliasedProject[alias];
    }
  }

  delete aliasedProject.action;

  if (typeof aliasedProject.project === 'string') {
    delete aliasedProject.project;
  }

  return aliasedProject;
}

function withProjectDefaults(project) {
  return {
    ...project,
    status: normalizeStatus(project.status || 'concept'),
    location: project.location || '',
  };
}

function getProjectName(command = {}) {
  const normalized = normalizeProject(command);
  return normalized.name || command.projectName || command.name || command.payload?.name || command.project?.name || '';
}

async function findProjectByName(name) {
  const target = normalizeName(name);

  if (!target) {
    return null;
  }

  const snapshot = await db.collection('projects').get();

  for (const doc of snapshot.docs) {
    const projectName = normalizeName(doc.data().name);
    if (projectName === target || projectName.includes(target) || target.includes(projectName)) {
      return {
        id: doc.id,
        data: doc.data(),
      };
    }
  }

  return null;
}

function createResponse(response, status, body) {
  response.status(status).json(body);
}

function assertAgentKey(request) {
  const expectedKey = agentKey.value();
  const providedKey = request.get('x-agent-key');

  if (!expectedKey || providedKey !== expectedKey) {
    const error = new Error('Unauthorized agent request');
    error.status = 401;
    throw error;
  }
}

async function createOrUpdateProject(command) {
  const project = normalizeProject(command);

  if (!project.name) {
    throw new Error('Project name is required');
  }

  const existingProject = await findProjectByName(project.name);
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (existingProject) {
    await db.collection('projects').doc(existingProject.id).set(
      {
        ...project,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      action: 'update_project',
      projectId: existingProject.id,
      message: `Updated existing project: ${project.name}`,
    };
  }

  const ref = await db.collection('projects').add({
    ...withProjectDefaults(project),
    createdAt: now,
    updatedAt: now,
  });

  return {
    action: 'create_project',
    projectId: ref.id,
    message: `Created project: ${project.name}`,
  };
}

async function updateProject(command) {
  const projectName = getProjectName(command);
  const updates = normalizeProject(command);
  const existingProject = await findProjectByName(projectName || updates.name);

  if (!existingProject) {
    throw new Error(`Project not found: ${projectName || updates.name || 'unknown project'}`);
  }

  await db.collection('projects').doc(existingProject.id).set(
    {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    action: 'update_project',
    projectId: existingProject.id,
    message: `Updated project: ${existingProject.data.name}`,
  };
}

async function deleteProject(command) {
  const projectName = getProjectName(command);
  const existingProject = await findProjectByName(projectName);

  if (!existingProject) {
    throw new Error(`Project not found: ${projectName || 'unknown project'}`);
  }

  await db.collection('projects').doc(existingProject.id).delete();

  return {
    action: 'delete_project',
    projectId: existingProject.id,
    message: `Deleted project: ${existingProject.data.name}`,
  };
}

async function addNote(command) {
  const projectName = getProjectName(command);
  const note = command.note || command.notes || command.payload?.note || command.payload?.notes || '';
  const existingProject = await findProjectByName(projectName);

  if (!existingProject) {
    throw new Error(`Project not found: ${projectName || 'unknown project'}`);
  }

  const previousNotes = existingProject.data.notes || '';
  const nextNotes = [previousNotes, note].filter(Boolean).join('\n\n');

  await db.collection('projects').doc(existingProject.id).set(
    {
      notes: nextNotes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    action: 'add_note',
    projectId: existingProject.id,
    message: `Added note to project: ${existingProject.data.name}`,
  };
}

async function createCalendarEventLater(command) {
  const projectName = getProjectName(command);
  const existingProject = await findProjectByName(projectName);

  if (!existingProject) {
    throw new Error(`Project not found: ${projectName || 'unknown project'}`);
  }

  await db.collection('agentInbox').add({
    type: 'calendar_event',
    status: 'pending',
    payload: command.payload || command,
    projectId: existingProject.id,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    action: 'create_calendar_event_later',
    projectId: existingProject.id,
    message: `Queued calendar event for: ${existingProject.data.name}`,
  };
}

async function executeCommand(command) {
  const action = command.action || (normalizeProject(command).name ? 'create_project' : '');

  switch (action) {
    case 'create_project':
      return createOrUpdateProject(command);
    case 'update_project':
      return updateProject(command);
    case 'delete_project':
      return deleteProject(command);
    case 'add_note':
      return addNote(command);
    case 'create_calendar_event_later':
      return createCalendarEventLater(command);
    default:
      throw new Error(`Unsupported action: ${command.action || 'missing action'}`);
  }
}

agentApp.post('/project', async (request, response) => {
  try {
    assertAgentKey(request);
    const result = await executeCommand(request.body || {});

    createResponse(response, 200, {
      ok: true,
      ...result,
    });
  } catch (error) {
    createResponse(response, error.status || 400, {
      ok: false,
      action: request.body?.action || 'none',
      projectId: '',
      message: error.message,
    });
  }
});

agentApp.use((_request, response) => {
  createResponse(response, 404, {
    ok: false,
    action: 'none',
    projectId: '',
    message: 'Use POST /agent/project',
  });
});

export const agent = onRequest(
  {
    region: 'asia-southeast1',
    secrets: [agentKey],
    cors: false,
  },
  agentApp,
);

