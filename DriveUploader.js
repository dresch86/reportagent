import { google } from 'googleapis';

export default class ReportAgent {
    constructor(email, privKey) {
      this.jwtClient = new google.auth.JWT(
        email,
        null,
        privKey,
        ['https://www.googleapis.com/auth/drive'],
        null
      );
    }
    authorizeJWT() {
      return new Promise((resolve, reject) => {
        this.jwtClient.authorize((err, tokens) => {
          if (err) {
            reject(err);
          }
          resolve(this.jwtClient);
        });
      });
    }
    uploadReport(fileName, fileBuffer, googleDestId) {
      const oFileObj = 
      {
        metadata: {
          name: fileName,
          parents: [googleDestId],
          fields: 'id'
        },
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: fileBuffer
        }
      };
  
      const drive = google.drive({ version: 'v3', auth: this.jwtClient});
  
      return new Promise((resolve, reject) => {
        drive.files.create({
          resource: oFileObj.metadata,
          media: oFileObj.media,
          fields: 'id'
        }, (err, uploadedFile) => {
          if (err) reject(err);
          resolve(uploadedFile.data);
        });
      });
    }
}