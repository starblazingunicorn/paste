import fs from 'fs';
import difference from 'lodash/difference';

const {convertSvgToReact} = require('@twilio-labs/svg-to-react');

import {
  getInputPath,
  getReactOutputPath,
  normalizeFileName,
  readdirAsync,
  getOutputComponentName,
  maybeHandleError,
} from '../utils';
import {SVG_PATH, REACT_PATH, BLOCKLIST_FILES} from '../constants';
import {reactIconTemplate} from '../templates/reactIconTemplate';
import {writeToFile} from '../../../../tools/utils/writeToFile';

// Converts raw svg to react component
function performFileConversion(fileName: string, outputPath: string, options: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.log(`Converting ${fileName}.`);
  // Read the SVG file
  fs.readFile(getInputPath(fileName), 'utf8', async (readFileError, fileContents) => {
    maybeHandleError('Invalid fileName provided', readFileError);
    const cleanedFileName = getOutputComponentName(fileName);
    // Convert the SVG into our ideal format
    let generatedComponent;
    try {
      generatedComponent = await convertSvgToReact(cleanedFileName, fileContents, options);
    } catch (error) {
      maybeHandleError('Error occured while generating the component!', error);
    }

    writeToFile(outputPath, generatedComponent, {
      errorMessage: `Couldn't write formatted SVG to disk`,
    });
  });
}

export async function convertNewAction(): Promise<void> {
  const sourceFiles = await readdirAsync(SVG_PATH);
  const destinationFiles = await readdirAsync(REACT_PATH);

  // Normalize file names so we can run a diff
  const normalizedSourceFiles = sourceFiles
    // If it isn't in the source files list, it won't generate
    .filter((fileName) => !BLOCKLIST_FILES.includes(fileName))
    .map(normalizeFileName);
  const normalizedDestinationFiles = destinationFiles.map(normalizeFileName);

  // Run the diff to get a list of files we need to convert to react components
  const newReactSvgs = difference(normalizedSourceFiles, normalizedDestinationFiles);

  // Generate a component for each new SVG in source
  newReactSvgs.forEach((normalizedFileName) => {
    // Since we normalized the filename, we need to get the original filename again.
    const fileName = sourceFiles[normalizedSourceFiles.indexOf(normalizedFileName)];
    performFileConversion(fileName, getReactOutputPath(fileName), {
      useHooks: false,
      template: reactIconTemplate,
    });
  });
}