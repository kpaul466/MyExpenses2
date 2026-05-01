const BACKUP_FILE_NAME = 'myexpenses_backup.json';

export const googleDriveService = {
  findBackupFile: async (token: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILE_NAME}' and spaces='appDataFolder'&spaces=appDataFolder&fields=files(id, name, modifiedTime)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Drive API Error: ${response.status}`);
      const data = await response.json();
      return data.files && data.files.length > 0 ? data.files[0] : null;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  uploadBackup: async (token: string, stateData: any, fileId?: string) => {
    const fileContent = JSON.stringify(stateData);
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      parents: ['appDataFolder']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileId ? {} : metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` 
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      
    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });

    if (!response.ok) throw new Error(`Drive Upload Error: ${response.status}`);
    return response.json();
  },

  downloadBackup: async (token: string, fileId: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error(`Drive Download Error: ${response.status}`);
    return response.json();
  }
};
