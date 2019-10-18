'use strict';

import fs from 'fs-extra';
import spawn from 'await-spawn';
import GAReportProcessor from './GAReportProcessor';

var sAuthor = '';

async function goaccessProcessor(goaCfg, jobObj) {
  let aGoAccessParams = 
  [ '--log-format', goaCfg.logFormat,
    '--log-file', jobObj.site.accessLog, 
    ('--output=' + jobObj.site.processedFile), 
    '--addr=127.0.0.1'
  ];

  if (goaCfg.ignoreQueryString) {
    aGoAccessParams.push('--no-query-string');
  }

  if (goaCfg.ignoreCrawlers) {
    aGoAccessParams.push('--ignore-crawlers');
  }

  let i=0;

  if (goaCfg.excludeIP.length > 0) {
    for (i=0;i<goaCfg.excludeIP.length;i++) {
      aGoAccessParams.push('--exclude-ip=' + goaCfg.excludeIP[i]);
    }
  }

  if (goaCfg.excludePanel.length > 0) {
    for (i=0;i<goaCfg.excludePanel.length;i++) {
      aGoAccessParams.push('--ignore-panel=' + goaCfg.excludePanel[i]);
    }
  }

  if (jobObj.site.sieveSettings.filterInternalHits) {
    aGoAccessParams.push('--hide-referer');
    aGoAccessParams.push('*' + jobObj.site.domain);
    aGoAccessParams.push('--ignore-referer=*' + jobObj.site.domain);
  }

  let blGoAccess = await spawn('goaccess', aGoAccessParams);

  if (!(blGoAccess instanceof Error)) {
    fs.readJson(jobObj.site.processedFile)
    .then(logData => {
      let rhGAReportHandler = new GAReportProcessor(sAuthor, logData);
      rhGAReportHandler.addGeneralInfoSheet();
      rhGAReportHandler.addSubdomainUsageSheet(jobObj.site.sieveSettings);
      rhGAReportHandler.addReferringSites(jobObj.site.sieveSettings);
      rhGAReportHandler.addVisitorsSheet();
      rhGAReportHandler.addBrowsersReport();
      return rhGAReportHandler.writeToBuffer(jobObj.driveDestId, jobObj.credentials);
    });
  }
}

fs.readJson('credentials.json')
.then(credentialsObj => {
  fs.readJson('config.json')
  .then(configObj => {
    let iNumSites = configObj.sites.length;
    sAuthor = configObj.author;

    for (let i=0;i<iNumSites;i++) {
      fs.watch(configObj.sites[i].accessLog, (eventType, filename) => {
        if (eventType === 'change') {
          if (filename) {
            if (configObj.sites[i].plugin == 'goaccess') {
              goaccessProcessor(configObj.plugins.goaccess,
                {
                  driveDestId: configObj.gDriveFolderId,
                  credentials: credentialsObj,
                  site: configObj.sites[i]
                }).catch((err) => console.error(err));
            } else {
              //TODO Handle a raw unprocessed log by default?
            }
          }
        } else if (eventType === 'error') {
          console.error('An error occurred watching [' + filename + ']');
        }
      });
    }
  })
  .catch(err => console.error('CONFIG: ' + err));
})
.catch(err => {
  console.error('CREDENTIALS: ' + err)
});