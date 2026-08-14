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

  // Fetch all notes with query filters
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

  // Get note detail by ID
  async getNoteById(id) {
    return request(`/api/notes/${id}`);
  },

  // Create single note
  async createNote(noteData) {
    return request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  // Batch create multiple plain-text notes
  async batchCreateNotes(notesArray) {
    return request('/api/notes/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesArray })
    });
  },

  // Update existing note
  async updateNote(id, noteData) {
    return request(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  },

  // Delete note
  async deleteNote(id) {
    return request(`/api/notes/${id}`, {
      method: 'DELETE'
    });
  },

  // Trigger minimal AI insights for a note
  async enhanceNoteAI(id) {
    return request(`/api/notes/${id}/enhance-ai`, {
      method: 'POST'
    });
  },

  // Upload original image and transcribe to plain text
  async uploadImage(file, { autoSave = false, title = '', content = '' } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (autoSave) formData.append('auto_save', 'true');
    if (title) formData.append('title', title);
    if (content) formData.append('content', content);

    const headers = {};
    const apiKey = localStorage.getItem('gemini_api_key');
    if (apiKey) {
      headers['X-Gemini-Key'] = apiKey;
    }

    return request('/api/upload', {
      method: 'POST',
      headers,
      body: formData
    });
  },

  // Get note & storage statistics
  async getStats() {
    return request('/api/stats');
  }
};
