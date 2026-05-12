const backupCollections = [
  {
    key: 'projects',
    label: 'projects',
    requiredFields: ['id', 'name', 'status'],
  },
  {
    key: 'contentItems',
    label: 'journal items',
    requiredFields: ['id', 'title', 'platform', 'status'],
  },
  {
    key: 'portfolioItems',
    label: 'portfolio items',
    requiredFields: ['id', 'title'],
  },
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getItemLabel(item, fallback) {
  return item.title || item.name || item.id || fallback;
}

function validateCollection(data, collection) {
  const value = data[collection.key];
  if (!Array.isArray(value)) {
    return [`Missing ${collection.key} array.`];
  }

  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) {
      return [`${collection.label} item ${index + 1} must be an object.`];
    }

    const missingFields = collection.requiredFields.filter((field) => item[field] === undefined || item[field] === null || item[field] === '');
    if (!missingFields.length) {
      return [];
    }

    return [`${getItemLabel(item, `${collection.label} item ${index + 1}`)} is missing ${missingFields.join(', ')}.`];
  });
}

export function parseBackupJson(text) {
  try {
    return { data: JSON.parse(text), error: '' };
  } catch {
    return { data: null, error: 'Backup file is not valid JSON.' };
  }
}

export function validateStudioBackup(data) {
  if (!isPlainObject(data)) {
    return {
      backup: null,
      errors: ['Backup root must be a JSON object.'],
      preview: null,
    };
  }

  const isStudioBackup = data.schema === 'studio-os-backup' || data.app === 'Be Blank Studio OS';
  if (!isStudioBackup) {
    return {
      backup: null,
      errors: ['This does not look like a Studio OS backup.'],
      preview: null,
    };
  }

  if (data.schema && data.schema !== 'studio-os-backup') {
    return {
      backup: null,
      errors: ['Backup schema is not supported.'],
      preview: null,
    };
  }

  const errors = backupCollections.flatMap((collection) => validateCollection(data, collection));
  const preview = {
    contentItems: Array.isArray(data.contentItems) ? data.contentItems.length : 0,
    portfolioItems: Array.isArray(data.portfolioItems) ? data.portfolioItems.length : 0,
    projects: Array.isArray(data.projects) ? data.projects.length : 0,
  };

  if (errors.length) {
    return { backup: null, errors, preview };
  }

  return {
    backup: {
      ...data,
      contentItems: data.contentItems,
      portfolioItems: data.portfolioItems,
      projects: data.projects,
    },
    errors: [],
    preview,
  };
}
