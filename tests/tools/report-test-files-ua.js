const readline = require('readline');
const { Command } = require('commander');
const YAML = require('js-yaml');

const fs = require('fs');
const DeviceDetector = require('./../../index');
const ClientHints = require('./../../client-hints');
const {grabLogFiles, parseCsvLine} = require('../functions');

const ParserHelper = require('./../../parser/helper');
const AggregateNewUa = require('./lib/aggregate-new-ua');

const FORMAT_OUTPUT_STRING = 'string';
const FORMAT_OUTPUT_FIXTURE = 'fixture';
const PARSE_TYPE_LOG = 'log';
const PARSE_TYPE_CSV_MATA_HINTS = 'csv-meta-hints';

/**
 * @param {string} folderTestPath - folder check all files or file
 * @param {string} folderFixturePath - current database fixtures
 * @param {{
 *    unique: 0,
 *    output: 'string',
 *    parse: 'csv-meta-hints',
 *    skipCheck: 0,
 *    deviceTrusted: 0,
 *    deviceInfo: 0,
 *    deviceCode: 0
 * }} options
 */
const parserLog = (folderTestPath, folderFixturePath, options) => {

  const uniqueOutput = options.unique ?? 0;
  const formatOutput = options.output ?? FORMAT_OUTPUT_STRING;
  const formatParse = options.parse ?? '';

  let files = grabLogFiles(folderTestPath);
  if (!files.length) {
    console.error('empty list files');
    return;
  }

  const clientHints = new ClientHints();
  const detector = new DeviceDetector({
    clientIndexes: true,
    deviceIndexes: true,
    deviceAliasCode: options.deviceCode  === '1',
    deviceTrusted: options.deviceTrusted  === '1',
    deviceInfo: options.deviceInfo === '1',
  });

  const aggregateNewUa = new AggregateNewUa({
    folderFixturePath, uniqueOutput
  });

  const reportFixture = (useragent, detectResult, clientHintData, clientHintJson) => {
    const result = {
      user_agent: ParserHelper.trimChars(useragent, '"'),
      headers: {},
      meta: {},
      os: {
        name: detectResult.os.name ?? '',
        version: detectResult.os.version ?? '',
        platform: detectResult.os.platform ?? ''
      },
      client: {
        ...(detectResult.client.type === 'browser' ? {
          type: detectResult.client.type ?? '',
          name: detectResult.client.name ?? '',
          version: detectResult.client.version ?? '',
          engine: detectResult.client.engine ?? '',
          engine_version: detectResult.client.engine_version ?? ''
        } : {
          type: detectResult.client.type ?? '',
          name: detectResult.client.name ?? '',
          version: detectResult.client.version ?? '',
        })
      },
      device: {
        type: detectResult.device.type ?? '',
        brand: detectResult.device.brand ?? '',
        model: detectResult.device.model ?? ''
      },
      os_family: detectResult.os.family ?? '',
      browser_family: detectResult.client.family ?? 'Unknown'
    };

    if (Object.keys(clientHintData.meta ?? {}).length === 0) {
      delete result.meta;
    } else if(clientHintData.meta) {
      result.meta = Object.assign(result.meta, clientHintData.meta);
    }

    if (Object.keys(clientHintData).length === 0) {
      delete result.headers;
    } else if (clientHintJson.hints) {
      result.headers = Object.assign(result.headers, clientHintJson.hints);
    }

    if (detector.deviceAliasCode) {
      result.device.code = detectResult.device.code
    }
    if (detector.deviceTrusted) {
      result.device.trusted = detectResult.device.trusted
    }

    if (detector.deviceInfo) {
      result.device.info = detectResult.device.info
    }
    console.log(YAML.dump([result], { indent: 2, lineWidth: Infinity }));
  };



  files.forEach(async (absolutePath) => {
    const lineReader = readline.createInterface({
      input: fs.createReadStream(absolutePath), terminal: false
    });
    for await (const row of lineReader) {
      let useragent = '';
      let clientHintJson = {};

      switch (formatParse) {
        case PARSE_TYPE_LOG:
          useragent = row;
          break;
        case PARSE_TYPE_CSV_MATA_HINTS:
          const columns = await parseCsvLine(row);
          useragent = columns[0];
          clientHintJson = JSON.parse(columns[1]);
          break;
      }

      const clientHintData = clientHints.parse(
        clientHintJson.hints ?? clientHintJson,
        clientHintJson.meta ?? clientHintJson
      );
      const check = !options.skipCheck ? aggregateNewUa.check(useragent) : true;
      const detectResult = detector.detect(useragent, clientHintData);

      if (check && formatOutput === FORMAT_OUTPUT_STRING) {
        console.log(useragent);
      }
      if (check && formatOutput === FORMAT_OUTPUT_FIXTURE) {
        reportFixture(useragent, detectResult, clientHintData, clientHintJson);
      }

    }
  });
};


const program = new Command();
program.description(`==========================================================
  This is a working file for filtering user agents that have not yet been processed and added to tests.
  Usages:
  $> node report-test-files-ua.js "./file.log" "./tests/fixtures/devices/" -u 1 -p log
==========================================================`);
program
  .argument('[parsePath]', 'folder check all files or file')
  .argument('[testsPath]', 'folder fixtures for compares', __dirname + '/../fixtures/devices/')
  .option('-u, --unique <number>', 'stage filter only unique device code', '0')
  .option('-p, --parse <string>', 'parse type [log, csv-meta-hints]', 'log')
  .option('-o, --output <string>', 'output type [string, fixture]', 'string')
  .option('-sc, --skip-check <number>', 'skip check useragent exist for tests', '0')
  .option('-dt, --device-trusted <number>', 'append trusted param to device.trusted', '0')
  .option('-di, --device-info <number>', 'append device info param to device.info', '0')
  .option('-dc, --device-code <number>', 'append code param to device.code', '0')
  .option('-ci, --compact-info <number>', 'append device info to device.info (compact mode)', '0')
  .action(function(parsePath, testsPath) {
    const options = this.opts();
    parserLog(parsePath, testsPath, options);
  });
program.parse(process.argv);
