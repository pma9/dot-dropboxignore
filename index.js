import fs from 'fs';
import path from 'path';

import chokidar from 'chokidar';
import ignore from 'ignore';
import minimist from 'minimist';

(async function () {
  let setIgnoredStatus;
  const ignoredDirectories = [];
  const currentPlatform = process.platform;

  const isParentDirectory = (parent, child) => {
    const relative = path.relative(parent, child);
    return (
      relative != null &&
      !relative.startsWith('..') &&
      !path.isAbsolute(relative)
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

  if (currentPlatform === 'darwin') {
    try {
      const xattr = (await import('fs-xattr')).default;

      setIgnoredStatus = (filePath) => {
        const setAttributes = xattr.listSync(filePath);
        if (!setAttributes.includes('com.dropbox.ignored')) {
          console.info('Setting extended attribute com.dropbox.ignored to 1');
          xattr.setSync(filePath, 'com.dropbox.ignored', '1');
        }
      };
    } catch (error) {
      console.error({ error }, 'There was an error with fs-xattr');
      process.exit(1);
    }
  } else if (currentPlatform === 'win32') {
    try {
      const Powershell = (await import('powershell')).default;

      setIgnoredStatus = (filePath) => {
        console.info(
          'Running Powershell command to set com.dropbox.ignored to 1',
        );

        const psSetToIgnoreCommand = `Set-Content -Path '${filePath}' -Stream com.dropbox.ignored -Value 1`;
        const ps = new Powershell(psSetToIgnoreCommand);

        // Handle process errors (e.g. powershell not found)
        ps.on('error', (err) => {
          console.error(err);
        });

        ps.on('error-output', (data) => {
          console.error(data);
        });
      };
    } catch (error) {
      console.log({ error }, 'There was an error with Powershell');
    }
  } else {
    console.error('Unable to support platforms other than Windows or MacOS');
    process.exit(1);
  }

  const argv = minimist(process.argv.slice(2));
  const dropboxIgnorePath = path.resolve(argv.path, '.dropboxignore');

  let dropboxIgnore;
  if (fs.existsSync(dropboxIgnorePath)) {
    dropboxIgnore = ignore().add(
      fs.readFileSync(dropboxIgnorePath, 'utf8').toString(),
    );
  } else {
    console.error('No .dropboxignore file found');
    process.exit(1);
  }

  console.info('Starting .dropboxignore watcher');

  const watchCallback = (event, filename) => {
    try {
      const relativeFilePath = path.relative(argv.path, filename);
      const absoluteFilePath = path.resolve(argv.path, filename);
      if (relativeFilePath !== '') {
        if (
          // ['add', 'change', 'addDir'].includes(event) &&
          dropboxIgnore.ignores(relativeFilePath)
        ) {
          console.info(
            { absoluteFilePath, event },
            'Found a file that should be ignored',
          );
          if (setIgnoredStatus != null) {
            const directoryName = path.dirname(absoluteFilePath);
            const ignoredDirectoriesLength = ignoredDirectories.length;
            const sortPosition = findSortPosition(
              directoryName,
              ignoredDirectories,
            );

            const possibleParent =
              sortPosition === 0
                ? ignoredDirectories[0]
                : ignoredDirectories[sortPosition - 1];

            const possibleChildIndex =
              sortPosition === ignoredDirectoriesLength
                ? sortPosition - 1
                : sortPosition;
            const possibleChild = ignoredDirectories[possibleChildIndex];

            console.log({ sortPosition, possibleParent, possibleChild });

            if (directoryName === ignoredDirectories[sortPosition]) {
              console.log('Already ignored');
              return; // Already ignored
            }

            if (
              possibleParent != null &&
              isParentDirectory(possibleParent, directoryName)
            ) {
              console.log('Parent already ignored');
              return; // Parent directory is already ignored
            }

            if (
              possibleChild != null &&
              isParentDirectory(directoryName, possibleChild)
            ) {
              console.log(`${directoryName} is parent to ${possibleChild}`);
              ignoredDirectories.splice(possibleChildIndex, 1, directoryName);
            } else {
              console.log('Not ignored yet');
              ignoredDirectories.splice(sortPosition, 0, directoryName);
              console.log({ ignoredDirectories });
            }
            // setIgnoredStatus(absoluteFilePath);
            console.log(`Syncing ${relativeFilePath}`);
          }
        }
      }
    } catch (error) {
      console.error({ error });
      process.exit(1);
    }
  };

  chokidar
    .watch(argv.path, { ignoreInitial: false })
    .on('all', watchCallback)
    .on('error', (error) => console.error({ error }));
})();
