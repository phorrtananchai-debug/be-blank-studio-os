const backupCollections = [
  {
    key: 'projects',
    label: 'projects',
    sampleField: 'name',
    untitledLabel: 'Untitled Project',
  },
  {
    key: 'contentItems',
    label: 'content items',
    sampleField: 'title',
    untitledLabel: 'Untitled Content Item',
  },
  {
    key: 'portfolioItems',
    label: 'portfolio items',
    sampleField: 'title',
    untitledLabel: 'Untitled Portfolio Item',
  },
];

const optionalBackupCollections = [
  {
    key: 'tasks',
    label: 'tasks',
    sampleField: 'title',
    untitledLabel: 'Untitled Task',
  },
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

    return [];
  });
}

function getSampleItems(items, collection) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, 3).map((item) => {
    const value = isPlainObject(item) ? item[collection.sampleField] : '';
    return String(value || '').trim() || collection.untitledLabel;
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

  const appName = String(data.app || '').trim();
  const isStudioBackup = data.schema === 'studio-os-backup' || appName === 'BE BLANK OS' || appName === 'Be Blank Studio OS';
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
  const collectionsForPreview = [
    ...backupCollections,
    ...optionalBackupCollections.filter((collection) => Array.isArray(data[collection.key])),
  ];
  const preview = collectionsForPreview.reduce((nextPreview, collection) => ({
    ...nextPreview,
    [collection.key]: Array.isArray(data[collection.key]) ? data[collection.key].length : 0,
    samples: {
      ...nextPreview.samples,
      [collection.key]: getSampleItems(data[collection.key], collection),
    },
  }), { samples: {} });

  if (errors.length) {
    return { backup: null, errors, preview };
  }

  return {
    backup: {
      ...data,
      contentItems: data.contentItems,
      portfolioItems: data.portfolioItems,
      projects: data.projects,
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
    },
    errors: [],
    preview,
  };
}
