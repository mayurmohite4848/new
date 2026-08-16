const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Helper to handle fetch responses and error reporting
 */
async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, options);
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }
  return data;
}

export const api = {
  // Check API status
  async checkHealth() {
    return request('/api/health');
  },

  // Verify Gemini API key with Google AI Studio
  async verifyKey(apiKey) {
    return request('/api/verify-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    });
  },

  // ==========================================
  // SINGLE NOTES API
  // ==========================================

  async getNotes({ search = '', tag = '', favorite = false, sortBy = 'created_at', order = 'desc' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    if (favorite) params.append('favorite', 'true');
    if (sortBy) params.append('sort_by', sortBy);
    if (order) params.append('order', order);

    const queryString = params.toString();
    const url = `/api/notes${queryString ? `?${queryString}` : ''}`;
    return request(url);
  },

  async getNoteById(id) {
    return request(`/api/notes/${id}`);
  },

  async createNote(noteData) {
    return request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  async batchCreateNotes(notesArray) {
    return request('/api/notes/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesArray })
    });
  },

  async updateNote(id, noteData) {
    return request(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  async deleteNote(id) {
    return request(`/api/notes/${id}`, {
      method: 'DELETE'
    });
  },

  async enhanceNoteAI(id) {
    return request(`/api/notes/${id}/enhance-ai`, {
      method: 'POST'
    });
  },

  async uploadImage(file, { autoSave = false, title = '', content = '' } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (autoSave) formData.append('auto_save', 'true');
    if (title) formData.append('title', title);
    if (content) formData.append('content', content);

    const apiKey = (localStorage.getItem('gemini_api_key') || '').trim();
    const headers = {};
    if (apiKey) {
      formData.append('gemini_api_key', apiKey);
      headers['X-Gemini-Key'] = apiKey;
    }

    return request('/api/upload', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  // ==========================================
  // MULTI-PAGE NOTEBOOKS API
  // ==========================================

  async getNotebooks({ search = '', subject = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (subject) params.append('subject', subject);
    const qs = params.toString();
    return request(`/api/notebooks${qs ? `?${qs}` : ''}`);
  },

  async getNotebookById(id) {
    return request(`/api/notebooks/${id}`);
  },

  async createNotebook(data) {
    return request('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async updateNotebook(id, data) {
    return request(`/api/notebooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteNotebook(id) {
    return request(`/api/notebooks/${id}`, {
      method: 'DELETE'
    });
  },

  async uploadNotebookBatch(files, { title = '', description = '', subject_tag = 'General', cover_color = '#6366f1' } = {}) {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    formData.append('title', title);
    formData.append('description', description);
    formData.append('subject_tag', subject_tag);
    formData.append('cover_color', cover_color);

    const apiKey = (localStorage.getItem('gemini_api_key') || '').trim();
    const headers = {};
    if (apiKey) {
      formData.append('gemini_api_key', apiKey);
      headers['X-Gemini-Key'] = apiKey;
    }

    return request('/api/notebooks/upload-batch', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  async addNotebookPages(notebookId, files) {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const apiKey = (localStorage.getItem('gemini_api_key') || '').trim();
    const headers = {};
    if (apiKey) {
      formData.append('gemini_api_key', apiKey);
      headers['X-Gemini-Key'] = apiKey;
    }

    return request(`/api/notebooks/${notebookId}/pages`, {
      method: 'POST',
      headers,
      body: formData
    });
  },

  async addNotebookPage(notebookId, { title = '', content = '', file = null } = {}) {
    const apiKey = (localStorage.getItem('gemini_api_key') || '').trim();

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      if (apiKey) formData.append('gemini_api_key', apiKey);

      return request(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: apiKey ? { 'X-Gemini-Key': apiKey } : {},
        body: formData
      });
    } else {
      return request(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
    }
  },

  async updateNotebookPage(notebookId, pageId, data) {
    return request(`/api/notebooks/${notebookId}/pages/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async deleteNotebookPage(notebookId, pageId) {
    return request(`/api/notebooks/${notebookId}/pages/${pageId}`, {
      method: 'DELETE'
    });
  },

  async reorderNotebookPages(notebookId, pageIds) {
    return request(`/api/notebooks/${notebookId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_ids: pageIds })
    });
  },

  getExportPdfUrl(notebookId) {
    return `${API_BASE}/api/notebooks/${notebookId}/export-pdf`;
  },

  getExportMdUrl(notebookId) {
    return `${API_BASE}/api/notebooks/${notebookId}/export-md`;
  },

  // Global Statistics
  async getStats() {
    return request('/api/stats');
  }
};
