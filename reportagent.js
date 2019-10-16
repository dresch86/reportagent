'use strict';

import fs from 'fs-extra';
import stream from 'stream';
import DriveUploader from './DriveUploader'
import GAReportProcessor from './GAReportProcessor';

fs.readJson('credentials.json')
.then(credentialsObj => {
  fs.readJson('config.json')
  .then(configObj => {
    fs.readJson(configObj.logFile)
    .then(logData => {
      let rhGAReportHandler = new GAReportProcessor(configObj.logAuthor, logData);
      rhGAReportHandler.addGeneralInfoSheet();
      rhGAReportHandler.addSubdomainUsageSheet(configObj.sieveSettings);
      rhGAReportHandler.addReferringSites(configObj.sieveSettings);
      rhGAReportHandler.addVisitorsSheet();
      rhGAReportHandler.addBrowsersReport();
      rhGAReportHandler.writeToBuffer()
      .then((buffer) => {
        let duReportHandler = new DriveUploader(credentialsObj.client_email, credentialsObj.private_key);
        duReportHandler.authorizeJWT()
        .then(() => {
          let stBufferStream = stream.PassThrough();
          stBufferStream.end(buffer);

          duReportHandler.uploadReport(rhGAReportHandler.getFilename('xlsx'), stBufferStream, configObj.gDriveFolderId)
          .then((file) => console.log('Uploaded File Id: ', file.id))
          .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
      });
    });
  })
  .catch(err => console.error('CONFIG: ' + err));
})
.catch(err => {
  console.error('CREDENTIALS: ' + err)
});