import Excel from 'exceljs';
import moment from 'moment';
import stream from 'stream';
import DriveUploader from './DriveUploader'

export default class GAReportProcessor {
    constructor(_author, _jsonLog) {
        this.jsonLog = _jsonLog;
        this.xlsxWorkbook = new Excel.Workbook();
        this.xlsxWorkbook.creator = _author;
        this.xlsxWorkbook.lastModifiedBy = _author;
        this.xlsxWorkbook.created = new Date();
        this.xlsxWorkbook.modified = new Date();
    }

    addGeneralInfoSheet() {
        let shSummaryReport = this.xlsxWorkbook.addWorksheet('Summary');
        shSummaryReport.state = 'visible';

        let oParameterTitleStyle =  
        {
            font: 
            {
                'bold': true,
                'size': 12
            }
        };

        shSummaryReport.mergeCells('A1:B1');
        shSummaryReport.getCell('A1').value = 'Domain Usage Summary';
        shSummaryReport.getCell('A1').style = 
        {
            font: 
            {
                bold: true,
                size: 16
            },
            alignment: 
            {
                horizontal: 'center'
            }
        };

        shSummaryReport.columns = 
        [
            { key: 'parameter', width: 20, style: oParameterTitleStyle },
            { key: 'value', width: 30, style: {alignment: {horizontal: 'center'}}}
        ];

        shSummaryReport.addRow(
            {
                parameter: 'Start Date',
                value: this.jsonLog.general.start_date
            }).commit();

        shSummaryReport.addRow(
            {
                parameter: 'End Date',
                value: this.jsonLog.general.end_date
            }).commit();

        shSummaryReport.addRow(
            {
                parameter: 'Total Requests',
                value: this.jsonLog.general.total_requests
            }).commit();

        shSummaryReport.addRow(
            {
                parameter: 'Log Size',
                value: ((this.jsonLog.general.log_size / 1000000).toFixed(1) + ' (MB)')
            }).commit();

        shSummaryReport.addRow(
            {
                parameter: 'Processing Time',
                value: (this.jsonLog.general.generation_time + ' s')
            }).commit();

        shSummaryReport.addRow(
            {
                parameter: 'Total Upstream',
                value: ((this.jsonLog.general.bandwidth / 1000000000).toFixed(1) + ' (GB)')
            }).commit();
    }

    addVisitorsSheet() {
        if (this.jsonLog.hasOwnProperty('visitors')) {
            let shVisitorsReport = this.xlsxWorkbook.addWorksheet('Visitors');
            shVisitorsReport.state = 'visible';

            let oCenteredColStyle = 
            {
                alignment: 
                {
                    vertical: 'middle', 
                    horizontal: 'center'
                }
            };

            // Repeat specific columns on every printed page
            shVisitorsReport.pageSetup.printTitlesColumn = 'A:D';
            shVisitorsReport.columns = 
            [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Hits', key: 'hits', width: 25, style: oCenteredColStyle },
                { header: 'Vistors', key: 'visitors', width: 25, style: oCenteredColStyle },
                { header: 'Data (MB)', key: 'data', width: 25, style: oCenteredColStyle }
            ];

            let iDateCount = this.jsonLog.visitors.data.length;
            this.jsonLog.visitors.data = this.jsonLog.visitors.data.reverse();

            for (let i=0; i<iDateCount; i++) {
                shVisitorsReport.addRow(
                    {
                        date: moment(this.jsonLog.visitors.data[i].data).format('l'), 
                        hits: this.jsonLog.visitors.data[i].hits.count + ' (' + this.jsonLog.visitors.data[i].hits.percent + '%)', 
                        visitors: this.jsonLog.visitors.data[i].visitors.count + ' (' + this.jsonLog.visitors.data[i].visitors.percent + '%)',
                        data: ((this.jsonLog.visitors.data[i].bytes.count / 1000000).toFixed(1)) + ' (' + this.jsonLog.visitors.data[i].bytes.percent + '%)'
                    }).commit();
            }

            shVisitorsReport.getRow(1).eachCell((item, idx) => 
            {
                item.style = oCenteredColStyle;
                item.style.font = 
                {
                    'bold': true,
                    'size': 14
                };
            });
        }
    }

    addReferringSites(rootDomain, sieveSettings) {
        if (this.jsonLog.hasOwnProperty('referring_sites')) {
            let shRefSitesReport = this.xlsxWorkbook.addWorksheet('Referring Sites');
            shRefSitesReport.state = 'visible';
    
            let oCenteredColStyle = 
            {
                alignment: 
                {
                    vertical: 'middle', 
                    horizontal: 'center'
                }
            };
            
            // Repeat specific columns on every printed page
            shRefSitesReport.pageSetup.printTitlesColumn = 'A:D';
            shRefSitesReport.columns = 
            [
                { header: 'Domain', key: 'subdomain', width: 40 },
                { header: 'Hits', key: 'hits', width: 25, style: oCenteredColStyle },
                { header: 'Vistors', key: 'visitors', width: 25, style: oCenteredColStyle },
                { header: 'Data (MB)', key: 'data', width: 25, style: oCenteredColStyle }
            ];

            let iRSCount = this.jsonLog.referring_sites.data.length;

            for (let i=0; i<iRSCount; i++) {
                if (sieveSettings.filterInternalHits) {
                    if (this.jsonLog.referring_sites.data[i].data.indexOf(rootDomain) == -1) {
                        shRefSitesReport.addRow(
                            {
                                subdomain: this.jsonLog.referring_sites.data[i].data, 
                                hits: this.jsonLog.referring_sites.data[i].hits.count + ' (' + this.jsonLog.referring_sites.data[i].hits.percent + '%)', 
                                visitors: this.jsonLog.referring_sites.data[i].visitors.count + ' (' + this.jsonLog.referring_sites.data[i].visitors.percent + '%)',
                                data: ((this.jsonLog.referring_sites.data[i].bytes.count / 1000000).toFixed(1)) + ' (' + this.jsonLog.referring_sites.data[i].bytes.percent + '%)'
                            }).commit();
                    } 
                } else {
                    shRefSitesReport.addRow(
                        {
                            subdomain: this.jsonLog.referring_sites.data[i].data, 
                            hits: this.jsonLog.referring_sites.data[i].hits.count + ' (' + this.jsonLog.referring_sites.data[i].hits.percent + '%)', 
                            visitors: this.jsonLog.referring_sites.data[i].visitors.count + ' (' + this.jsonLog.referring_sites.data[i].visitors.percent + '%)',
                            data: ((this.jsonLog.referring_sites.data[i].bytes.count / 1000000).toFixed(1)) + ' (' + this.jsonLog.referring_sites.data[i].bytes.percent + '%)'
                        }).commit();
                }
            }

            shRefSitesReport.getRow(1).eachCell((item, idx) => 
            {
                item.style = oCenteredColStyle;
                item.style.font = 
                {
                    'bold': true,
                    'size': 14
                };
            });
        }  
    }

    addSubdomainUsageSheet(rootDomain, sieveSettings) {
        if (this.jsonLog.hasOwnProperty('vhosts')) {
            let shSubdomainReport = this.xlsxWorkbook.addWorksheet('Sub-Domains');
            shSubdomainReport.state = 'visible';
    
            let oCenteredColStyle = 
            {
                alignment: 
                {
                    vertical: 'middle', 
                    horizontal: 'center'
                }
            };
            
            // Repeat specific columns on every printed page
            shSubdomainReport.pageSetup.printTitlesColumn = 'A:D';
            shSubdomainReport.columns = 
            [
                { header: 'Sub-Domain', key: 'subdomain', width: 40 },
                { header: 'Hits', key: 'hits', width: 25, style: oCenteredColStyle },
                { header: 'Vistors', key: 'visitors', width: 25, style: oCenteredColStyle },
                { header: 'Data (MB)', key: 'data', width: 25, style: oCenteredColStyle }
            ];

            let iSDCount = this.jsonLog.vhosts.data.length;
            let oErroneousEvent = 
            {
                subdomain: "Other",
                hits: 
                {
                    count: 0,
                    percent: 0
                },
                visitors:
                {
                    count: 0,
                    percent: 0
                },
                bytes: 
                {
                    count: 0,
                    percent: 0
                }
            };

            for (let i=0; i<iSDCount; i++) {
                if (sieveSettings.filterInternalHits) {
                    if (this.jsonLog.vhosts.data[i].data.indexOf(rootDomain) > -1) {
                        shSubdomainReport.addRow(
                            {
                                subdomain: this.jsonLog.vhosts.data[i].data, 
                                hits: this.jsonLog.vhosts.data[i].hits.count + ' (' + this.jsonLog.vhosts.data[i].hits.percent + '%)', 
                                visitors: this.jsonLog.vhosts.data[i].visitors.count + ' (' + this.jsonLog.vhosts.data[i].visitors.percent + '%)',
                                data: ((this.jsonLog.vhosts.data[i].bytes.count / 1000000).toFixed(1)) + ' (' + this.jsonLog.vhosts.data[i].bytes.percent + '%)'
                            }).commit();
                    } else {
                        oErroneousEvent.hits.count += this.jsonLog.vhosts.data[i].hits.count;
                        oErroneousEvent.visitors.count += this.jsonLog.vhosts.data[i].visitors.count;
                        oErroneousEvent.bytes.count += this.jsonLog.vhosts.data[i].bytes.count;

                        oErroneousEvent.hits.percent += parseFloat(this.jsonLog.vhosts.data[i].hits.percent);
                        oErroneousEvent.visitors.percent += parseFloat(this.jsonLog.vhosts.data[i].visitors.percent);
                        oErroneousEvent.bytes.percent += parseFloat(this.jsonLog.vhosts.data[i].bytes.percent);
                    }
                } else {
                    shSubdomainReport.addRow(
                        {
                            subdomain: this.jsonLog.vhosts.data[i].data, 
                            hits: this.jsonLog.vhosts.data[i].hits.count + ' (' + this.jsonLog.vhosts.data[i].hits.percent + '%)', 
                            visitors: this.jsonLog.vhosts.data[i].visitors.count + ' (' + this.jsonLog.vhosts.data[i].visitors.percent + '%)',
                            data: ((this.jsonLog.vhosts.data[i].bytes.count / 1000000).toFixed(1)) + ' (' + this.jsonLog.vhosts.data[i].bytes.percent + '%)'
                        });
                }
            }

            if (oErroneousEvent.hits.count > 0) {
                shSubdomainReport.addRow(
                    {
                        subdomain: oErroneousEvent.subdomain, 
                        hits: oErroneousEvent.hits.count + ' (' + oErroneousEvent.hits.percent.toFixed(1) + '%)', 
                        visitors: oErroneousEvent.visitors.count + ' (' + oErroneousEvent.visitors.percent.toFixed(1) + '%)',
                        data: ((oErroneousEvent.bytes.count / 1000000).toFixed(1)) + ' (' + oErroneousEvent.bytes.percent.toFixed(1) + '%)'                        
                    }
                ).commit();
            }

            shSubdomainReport.getRow(1).eachCell((item, idx) => 
            {
                item.style = oCenteredColStyle;
                item.style.font = 
                {
                    'bold': true,
                    'size': 14
                };
            });
        }        
    }

    addBrowsersReport() {
        if (this.jsonLog.hasOwnProperty('browsers')) {
            let shBrowsersReport = this.xlsxWorkbook.addWorksheet('Browsers');
            shBrowsersReport.state = 'visible';

            let oCenteredColStyle = 
            {
                alignment: 
                {
                    vertical: 'middle', 
                    horizontal: 'center'
                }
            };

            // Repeat specific columns on every printed page
            shBrowsersReport.pageSetup.printTitlesColumn = 'A:D';
            shBrowsersReport.columns = 
            [
                { header: 'Browsers', key: 'browsers', width: 20 },
                { header: 'Hits', key: 'hits', width: 25, style: oCenteredColStyle },
                { header: 'Vistors', key: 'visitors', width: 25, style: oCenteredColStyle },
                { header: 'Data (MB)', key: 'data', width: 25, style: oCenteredColStyle }
            ];

            let iDateCount = this.jsonLog.browsers.data.length;

            for (let i=0; i<iDateCount; i++) {
                shBrowsersReport.addRow(
                    {
                        browsers: this.jsonLog.browsers.data[i].data, 
                        hits: this.jsonLog.browsers.data[i].hits.count + ' (' + this.jsonLog.browsers.data[i].hits.percent + '%)', 
                        visitors: this.jsonLog.browsers.data[i].visitors.count + ' (' + this.jsonLog.browsers.data[i].visitors.percent + '%)',
                        data: ((this.jsonLog.browsers.data[i].bytes.count / 1000000).toFixed(1)) + ' (' + this.jsonLog.browsers.data[i].bytes.percent + '%)'
                    }).commit();
            }

            shBrowsersReport.getRow(1).eachCell((item, idx) => 
            {
                item.style = oCenteredColStyle;
                item.style.font = 
                {
                    'bold': true,
                    'size': 14
                };
            });
        }
    }

    writeToLocalFile(path) {
        this.xlsxWorkbook.xlsx.writeFile(path)
        .then(() => console.log('Data compiled and written to file!'));
    }

    writeToGoogleDrive(folderId, credentialsObj) {
        let sFilename = 'LOG-' + moment(this.jsonLog.general.start_date, 'DD/MMM/YYYY').format('MMDDYYYY') + '-' + moment(this.jsonLog.general.end_date, 'DD/MMM/YYYY').format('MMDDYYYY') + '.xlsx';
        this.xlsxWorkbook.xlsx.writeBuffer()
        .then((buffer) => {
          let duReportHandler = new DriveUploader(credentialsObj.client_email, credentialsObj.private_key);
          duReportHandler.authorizeJWT()
          .then(() => {
            let stBufferStream = stream.PassThrough();
            stBufferStream.end(buffer);
    
            duReportHandler.uploadReport(sFilename, stBufferStream, folderId)
            .then((file) => console.log('Uploaded file [' + file.id + ']...'))
            .catch(err => console.error(err));
          })
          .catch(err => console.error(err));
        });
    }
}