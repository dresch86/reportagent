'use strict';

import fs from 'fs-extra';
import moment from 'moment';
import chokidar from 'chokidar';
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

  if (goaCfg.includePanel.length > 0) {
    for (i=0;i<goaCfg.excludePanel.length;i++) {
      aGoAccessParams.push('--include-panel=' + goaCfg.includePanel[i]);
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

  let blGoAccess = await spawn('goaccess', aGoAccessParams, { stdio: ['ignore', 'pipe', 'pipe'] })
  .then(output => 
    {
      let sResult = output.toString().trim();

      if (sResult.length > 0) {
        console.log("GoAccess Result: \r\n" + sResult);
      }

      console.log('Compiling log [' + moment().format() + ']...');

      fs.readJson(jobObj.site.processedFile)
      .then(logData => {
        let rhGAReportHandler = new GAReportProcessor(sAuthor, logData);
        rhGAReportHandler.addGeneralInfoSheet();
        rhGAReportHandler.addSubdomainUsageSheet(jobObj.site.sieveSettings);
        rhGAReportHandler.addReferringSites(jobObj.site.sieveSettings);
        rhGAReportHandler.addVisitorsSheet();
        rhGAReportHandler.addBrowsersReport();

        console.log('Uploading to Google Drive [' + moment().format() + ']...');
        rhGAReportHandler.writeToGoogleDrive(jobObj.driveDestId, jobObj.credentials);
        return true;
      }).catch(err => {
        console.error(err);
        return false;
      });
    }).catch(err => 
      {
        console.error(err.stderr.toString());
        return false;
      });
}

fs.readJson('credentials.json')
.then(credentialsObj => {
  fs.readJson('config.json')
  .then(configObj => {
    let iNumSites = configObj.sites.length;
    sAuthor = configObj.author;

    for (let i=0;i<iNumSites;i++) {
      chokidar.watch(configObj.sites[i].accessLog)
      .on('change', path => 
      {
        if (configObj.sites[i].plugin == 'goaccess') {
          goaccessProcessor(configObj.plugins.goaccess,
            {
              driveDestId: configObj.gDriveFolderId,
              credentials: credentialsObj,
              site: configObj.sites[i]
            }).catch(err => console.error(err.toString()));
        } else {
          //TODO Handle a raw unprocessed log by default?
        }
      })
      .on('error', error => 
      {
        console.error('Watcher error: ' + error);
      });
    }
  })
  .catch(err => console.error('CONFIG: ' + err));
})
.catch(err => {
  console.error('CREDENTIALS: ' + err)
});