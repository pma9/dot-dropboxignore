import fs from 'fs';
import path from 'path';

import ignore from 'ignore';
import minimist from 'minimist';

(async function () {
  let setIgnoredStatus;
  const currentPlatform = process.platform;

  if (currentPlatform === 'darwin') {
    try {
      const xattr = await import('fs-xattr');

      setIgnoredStatus = (filePath) => {
        console.info('Setting extended attribute com.dropbox.ignored to 1');
        xattr.setSync(filePath, 'com.dropbox.ignored', '1');
      };
    } catch (error) {
      console.error({ error }, 'There was an error with fs-xattr');
      process.exit(1);
    }
  } else if (currentPlatform === 'win32') {
    try {
      const Powershell = await import('powershell');

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

  const fileListener = (eventType, filename) => {
    if (eventType === 'rename' && dropboxIgnore.ignores(filename)) {
      const filePath = path.resolve(argv.path, filename);
      console.info({ filePath }, 'Found a file that should be ignored');
      if (setIgnoredStatus != null) {
        setIgnoredStatus(filePath);
      }
    }
  };
  fs.watch(argv.path, { recursive: true }, fileListener);
})();
