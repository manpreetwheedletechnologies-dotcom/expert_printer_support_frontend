const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
};

const replaceExtensions = () => {
  const files = getAllFiles(SRC_DIR);
  
  files.forEach((filePath) => {
    if (path.extname(filePath) === '.jsx' || path.extname(filePath) === '.js' || path.extname(filePath) === '.tsx' || path.extname(filePath) === '.ts') {
      let content = fs.readFileSync(filePath, 'utf-8');
      
      const newContent = content
        .replace(/\.png/g, '.webp')
        .replace(/\.jpg/g, '.webp')
        .replace(/\.jpeg/g, '.webp');
      
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`✅ Updated ${path.basename(filePath)}`);
      }
    }
  });
};

replaceExtensions();
