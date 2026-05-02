const fs = require('fs');
const path = require('path');

const cmakePath = path.join(__dirname, '..', 'node_modules', 'expo-modules-core', 'android', 'CMakeLists.txt');

if (!fs.existsSync(cmakePath)) {
  process.exit(0);
}

const source = fs.readFileSync(cmakePath, 'utf8');
if (source.includes('\n  c++_shared\n')) {
  process.exit(0);
}

const patched = source.replace(
  '  CommonSettings\n  ${LOG_LIB}\n  fbjni::fbjni',
  '  CommonSettings\n  ${LOG_LIB}\n  c++_shared\n  fbjni::fbjni'
);

if (patched === source) {
  console.warn('Could not patch expo-modules-core CMakeLists.txt');
  process.exit(0);
}

fs.writeFileSync(cmakePath, patched);
console.log('Patched expo-modules-core CMakeLists.txt');
