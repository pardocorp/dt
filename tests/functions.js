const fs = require('fs');
const Table = require('cli-table');
const YAML = require('js-yaml');

const csv = require('@fast-csv/parse');

const parseCsvLine = (string, separator = ',') => {
  return new Promise((resolve, reject) => {
    csv.parseString(string, { headers: false })
      .on('error', error => {reject(error)})
      .on('data', row => { resolve(row)})
  })
}

function hasEnvDebug() {
  return (process.env.DEBUG_TABLE && process.env.DEBUG_TABLE === 'true');
}
function isFile (path) {
  return fs.lstatSync(path).isFile();
}

function isDir(path) {
  return fs.lstatSync(path).isDirectory();
}

function grabLogFiles(folderTestPath) {
  let files = [];
  if (isDir(folderTestPath)) {
    fs.readdirSync(folderTestPath).forEach((file) => {
      let absolutePath = folderTestPath + file;
      if (!isFile(absolutePath)) {
        return;
      }
      files.push(absolutePath);
    });
  } else if (isFile(folderTestPath)) {
    files.push(folderTestPath);
  }

  return files;
}

/**
 * @param fixture
 * @param result
 */
function perryTable(fixture, result) {
  if (!hasEnvDebug()) {
    return;
  }

  try {
    console.log('UserAgent \x1b[33m%s\x1b[0m', fixture.user_agent);
    const table = new Table({
      head: ['Result', 'Fixture'],
      colWidths: [50, 50],
    });
    table.push([perryJSON(result), perryJSON(fixture)]);
    console.log(table.toString());
  } catch (e) {
    throw new SyntaxError(e.stack);
  }
}

function revertKeysForObjects(items) {
  return Object.assign(
    {},
    ...Object.entries(items).map(([a, b]) => ({ [b]: a })),
    {}
  );
}

function YAMLLoad(yamlPath) {
  return YAML.load(fs.readFileSync(yamlPath, 'utf8'));
}

function YAMLDump(objects) {
  return YAML.dump(objects);
}

function perryJSON(obj) {
  return JSON.stringify(obj, null, 2);
}

function isObjNotEmpty(value) {
  return value !== void 0 && value !== null
}

function normalizeVersion(version, count) {
  if (version === '' || version === null) {
    return '';
  }
  let versionParts = String(version).split(/\./);
  let versionPartsCount = versionParts.length;
  if (versionPartsCount === 1 && versionParts[0] === '') {
    return null;
  }
  while (versionPartsCount < count) {
    versionParts.push('0');
  }
  if (versionPartsCount > 0 && versionPartsCount < count) {
    version = versionParts.slice(0, count).join('.');
  }
  return version;
}

function getFixtureFolder() {
  return __dirname + '/fixtures/';
}


module.exports = {
  YAMLDump,
  YAMLLoad,
  grabLogFiles,
  isFile,
  isDir,
  parseCsvLine,
  revertKeysForObjects,
  normalizeVersion,
  perryTable,
  perryJSON,
  getFixtureFolder,
  isObjNotEmpty,
};
