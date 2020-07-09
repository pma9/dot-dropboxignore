import path from 'path';

const ignoredDirectories = [];

const isParentDirectory = (parent, child) => {
  const relative = path.relative(parent, child);
  return (
    relative != null && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
};

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

export const isAlreadyIgnored = function (absoluteFilePath, isDirectory) {
  const directoryName = path.dirname(absoluteFilePath);
  const ignoredDirectoriesLength = ignoredDirectories.length;
  const sortPosition = findSortPosition(directoryName, ignoredDirectories);

  const directoryAtSortPosition = ignoredDirectories[sortPosition];

  const possibleParentDirectory =
    sortPosition === 0
      ? ignoredDirectories[0]
      : ignoredDirectories[sortPosition - 1];

  const possibleChildDirectoryIndex =
    sortPosition === ignoredDirectoriesLength ? sortPosition - 1 : sortPosition;
  const possibleChildDirectory =
    ignoredDirectories[possibleChildDirectoryIndex];

  console.log({
    sortPosition,
    possibleParentDirectory,
    possibleChildDirectory,
  });

  if (
    absoluteFilePath === directoryAtSortPosition ||
    directoryName === directoryAtSortPosition
  ) {
    console.log('Already ignored');
    return true; // Already ignored
  }

  if (
    possibleParentDirectory != null &&
    isParentDirectory(possibleParentDirectory, directoryName)
  ) {
    console.log('Parent already ignored');
    return true; // Parent directory is already ignored
  }

  if (isDirectory) {
    if (
      possibleChildDirectory != null &&
      isParentDirectory(directoryName, possibleChildDirectory)
    ) {
      console.log(`${directoryName} is parent to ${possibleChildDirectory}`);
      ignoredDirectories.splice(possibleChildDirectoryIndex, 1, directoryName);
    } else {
      console.log('Not ignored yet');
      ignoredDirectories.splice(sortPosition, 0, directoryName);
      console.log({ ignoredDirectories });
    }
  }

  return false;
};
