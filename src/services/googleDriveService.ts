const BACKUP_FILE_NAME = 'myexpenses_backup.json';

export const googleDriveService = {
  findBackupFile: async (token: string) => {
    try {
      const q = encodeURIComponent(`name = '${BACKUP_FILE_NAME}'`);
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id, name, modifiedTime)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Drive API Error: ${response.status} - ${errorText}`);
      }
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
      parents: fileId ? undefined : ['appDataFolder']
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "--" + boundary;
    const close_delim = "--" + boundary + "--";

    const multipartRequestBody =
      delimiter + "\r\n" +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + "\r\n" +
      delimiter + "\r\n" +
      'Content-Type: application/json\r\n\r\n' +
      fileContent + "\r\n" +
      close_delim;

    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` 
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      
    const method = fileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive Upload Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  },

  downloadBackup: async (token: string, fileId: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive Download Error: ${response.status} - ${errorText}`);
    }
    return response.json();
  }
};
