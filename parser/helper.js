const YAML = require('js-yaml');
const fs = require('fs');

/**
 * match for base regex rule
 * @param str
 * @param userAgent
 * @returns {RegExpExecArray}
 */
function matchUserAgent(str, userAgent) {
  str = str.replace(new RegExp('/', 'g'), '\\/');
  let regex = '(?:^|[^A-Z_-])(?:' + str + ')';
  let match = new RegExp(regex, 'i');
  return match.exec(userAgent);
}

/**
 *
 * @param val1
 * @param val2
 * @returns {boolean}
 */
function fuzzyCompare(val1, val2) {
  return val1.replace(/ /gi, '').toLowerCase() ===
    val2.replace(/ /gi, '').toLowerCase();
}

/**
 * Compare versions
 * @param ver1
 * @param ver2
 * @returns {number}
 */
function versionCompare(ver1, ver2) {
  if (ver1 === ver2) {
    return 0;
  }
  let left = ver1.split('.');
  let right = ver2.split('.');
  let len = Math.min(left.length, right.length);
  for (let i = 0; i < len; i++) {
    if (left[i] === right[i]) {
      continue;
    }
    if (parseInt(left[i]) > parseInt(right[i])) {
      return 1;
    }
    if (parseInt(left[i]) < parseInt(right[i])) {
      return -1;
    }
  }
  if (left.length > right.length) {
    return 1;
  }
  if (left.length < right.length) {
    return -1;
  }
  return 0;
}

/**
 * @param {string} version
 * @param {number} maxMinorParts - how many version chars trim
 * @returns {string}
 */
function versionTruncate(version, maxMinorParts) {
  let versionParts = String(version).split('.');
  if (
    maxMinorParts !== void 0 &&
    versionParts.length > maxMinorParts
  ) {
    versionParts = versionParts.slice(0, 1 + maxMinorParts);
  }
  return versionParts.join('.');
}

/**
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasAndroidTableFragment(userAgent) {
  return (
    matchUserAgent('Android( [\\.0-9]+)?; Tablet', userAgent) !== null
  );
}

/**
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasOperaTableFragment(userAgent) {
  return matchUserAgent('Opera Tablet', userAgent) !== null;
}

/**
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasTouchFragment(userAgent) {
  return matchUserAgent('Touch', userAgent) !== null;
}

/**
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasAndroidMobileFragment(userAgent) {
  return matchUserAgent('Android( [.0-9]+)?; Mobile;', userAgent) !== null;
}

/**
 * All devices running Opera TV Store are assumed to be a tv
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasOperaTVStoreFragment(userAgent) {
  return matchUserAgent('Opera TV Store| OMI/', userAgent) !== null;
}

/**
 * All devices that contain Andr0id in string are assumed to be a tv
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasAndroidTVFragment(userAgent) {
  return matchUserAgent('Andr0id|Android TV', userAgent) !== null;
}

/**
 * All devices running Tizen TV or SmartTV are assumed to be a tv
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasTVFragment(userAgent) {
  return matchUserAgent('SmartTV|Tizen.+ TV .+$', userAgent) !== null;
}

/**
 * Check combinations in string that relate only to desktop UA
 * @param {string} userAgent
 * @returns {boolean}
 */
function hasDesktopFragment(userAgent) {
  return matchUserAgent('Desktop (x(?:32|64)|WOW64);', userAgent) !== null;
}

/**
 * @param {object} options
 * @param {string }propName
 * @param {*} defaultValue
 * @return {*|null}
 */
function getPropertyValue(options, propName, defaultValue) {
  return options !== void 0 && options[propName] !== void 0
    ? options[propName]
    : defaultValue !== void 0
      ? defaultValue
      : null;
}

/**
 *
 * @param {*} obj -
 * @returns {*}
 */
function revertObject(obj) {
  return Object.assign(
    {},
    ...Object.entries(obj).map(([a, b]) => ({
      [b]: a,
    })),
    {},
  );
}

/**
 * Load yaml file (sync read)
 * @param {string} file - absolute file path
 * @returns {*}
 */
function loadYMLFile(file) {
  return YAML.load(fs.readFileSync(file));
}

function hasFile(file) {
  return fs.existsSync(file);
}

/**
 * Remove chars for string
 *
 * @param {} str
 * @param {string} chars
 * @returns {any}
 */
function trimChars(str, chars) {
  let start = 0,
    end = str.length;
  
  while (start < end && str[start] === chars)
    ++start;
  
  while (end > start && str[end - 1] === chars)
    --end;
  
  return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}

function getGroupForUserAgentTokens(tokens) {
  let groupIndex = 0;
  return tokens.reduce((group = [], token) => {
    if (token === '') {
      return;
    }
    
    let data = token.match(/^\((.*)\)$/);
    if (data !== null) {
      groupIndex++;
      let rows = data[1].split(/[;,] /);
      let row = {};
      row['#' + groupIndex] = rows;
      group.push(row);
      return group;
    }
    
    let rowSlash = token.split('/');
    if (rowSlash.length === 2) {
      let row = {};
      row[rowSlash[0]] = rowSlash[1];
      group.push(row);
      return group;
    }
    groupIndex++;
    let row = {};
    row['#' + groupIndex] = token;
    group.push(row)
    return group;
  }, []);
}

function getTokensForUserAgent(userAgent) {
  let tokenRegex = / (?![^(]*\))/i;
  return userAgent.split(tokenRegex);
}

/**
 * Split UserAgent to tokens and groups
 *
 * @param userAgent
 * @returns {{groups: *, userAgent: *, tokens: *}}
 */
function splitUserAgent(userAgent) {
  let tokens = getTokensForUserAgent(userAgent);
  let groups = getGroupForUserAgentTokens(tokens);
  
  return {userAgent, tokens, groups};
}

module.exports = {
  matchUserAgent,
  fuzzyCompare,
  versionCompare,
  versionTruncate,
  hasAndroidTableFragment,
  hasOperaTableFragment,
  hasOperaTVStoreFragment,
  hasAndroidMobileFragment,
  hasAndroidTVFragment,
  hasDesktopFragment,
  hasTVFragment,
  hasTouchFragment,
  getPropertyValue,
  revertObject,
  loadYMLFile,
  hasFile,
  trimChars,
  splitUserAgent,
}