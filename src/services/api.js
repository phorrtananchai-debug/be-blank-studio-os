const API_BASE_URL = 'http://127.0.0.1:8787';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Local API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function checkApiHealth() {
  return request('/api/health');
}

export async function fetchApiProjects() {
  return request('/api/projects');
}

export async function fetchStudioData() {
  return request('/api/studio-os');
}

export async function createApiProject(project) {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(project),
  });
}

export async function updateApiProject(id, updates) {
  return request(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteApiProject(id) {
  return request(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
