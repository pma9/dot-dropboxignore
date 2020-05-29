import nodeDir from 'node-dir';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import util from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));

const findSortPosition = (
  pathInQuestion,
  directories,
  startIndex,
  endIndex,
) => {
  const length = directories.length;
  const start = startIndex != null ? startIndex : 0;
  const end = endIndex != null ? endIndex : length - 1;
  const mid = start + Math.floor((end - start) / 2);

  if (pathInQuestion.localeCompare(directories[start]) <= 0) {
    return start;
  }

  if (pathInQuestion.localeCompare(directories[end]) > 0) {
    return end + 1;
  }

  if (pathInQuestion.localeCompare(directories[mid]) < 0) {
    return findSortPosition(pathInQuestion, directories, start, mid - 1);
  }

  if (pathInQuestion.localeCompare(directories[mid]) > 0) {
    return findSortPosition(pathInQuestion, directories, mid + 1, end);
  }

  if (pathInQuestion.localeCompare(directories[mid]) === 0) {
    return mid;
  }
};

// const arr = ['a', 'b', 'c', 'd', 'e'];
// const arr = ['b', 'c', 'd', 'e', 'f', 'g'];

// const testCases = [
//   ['a', 0],
//   ['aa', 0],
//   ['b', 0],
//   ['bb', 1],
//   ['c', 1],
//   ['cc', 2],
//   ['d', 2],
//   ['dd', 3],
//   ['e', 3],
//   ['ee', 4],
//   ['f', 4],
//   ['ff', 5],
//   ['g', 5],
//   ['gg', 6],
// ];

// for (const [val, expectedIdx] of testCases) {
//   const sortPosition = findSortPosition(val, arr);
//   console.log(`${sortPosition === expectedIdx ? 'PASS' : 'FAIL'}`);
// }

// console.log(findSortPosition('a', []));

(async function () {
  let sortedDirs = [];
  const promisedSubDirs = util.promisify(nodeDir.subdirs);
  const allSubDirs = await promisedSubDirs(__dirname);

  console.dir(allSubDirs);

  for (const subDir of allSubDirs) {
    const sortPosition = findSortPosition(subDir, sortedDirs);

    if (subDir === sortedDirs[sortPosition]) {
      continue;
    }

    sortedDirs.splice(sortPosition, 0, subDir);
  }

  console.dir(sortedDirs);
})();
