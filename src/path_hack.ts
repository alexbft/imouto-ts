// Hack to resolve non-relative paths in Node.
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();
