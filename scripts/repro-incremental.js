const path = require('path');
const fs = require('fs-extra');

(async () => {
  const { copyFiles } = require('../src/utils/file-manager');
  const os = require('os');

  const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bf-copy-repro-'));
  const sourceFolder = path.join(testDir, 'source');
  const photoDest = path.join(testDir, 'photos');
  const videoDest = path.join(testDir, 'videos');
  const folderName = 'cli-test';

  await fs.ensureDir(sourceFolder);
  await fs.writeFile(path.join(sourceFolder, 'a.jpg'), 'A');
  await fs.writeFile(path.join(sourceFolder, 'b.mp4'), 'B');

  const today = new Date().toISOString().slice(0, 10);
  const photoPath = path.join(photoDest, `${today}_${folderName}`, 'BF');
  const videoPath = path.join(videoDest, `${today}_${folderName}`, 'BF');

  await fs.ensureDir(photoPath);
  await fs.ensureDir(videoPath);
  await fs.writeFile(path.join(photoPath, 'a.jpg'), 'EXISTING');
  await fs.writeFile(path.join(videoPath, 'b.mp4'), 'EXISTINGV');

  console.log('Before:', {
    photo: await fs.readdir(photoPath),
    video: await fs.readdir(videoPath)
  });

  const res = await copyFiles(sourceFolder, photoDest, videoDest, folderName);
  console.log('Result:', res);

  console.log('After:', {
    photo: await fs.readdir(photoPath),
    video: await fs.readdir(videoPath)
  });

  const readA = await fs.readFile(path.join(photoPath, 'a.jpg'), 'utf8');
  const readB = await fs.readFile(path.join(videoPath, 'b.mp4'), 'utf8');
  console.log('Contents preserved?', readA === 'EXISTING' && readB === 'EXISTINGV');
})();

