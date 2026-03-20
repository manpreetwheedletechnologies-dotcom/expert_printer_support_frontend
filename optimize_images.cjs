const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure sharp is correctly required for ESM or CommonJS
const optimize = async () => {
  const files = fs.readdirSync(PUBLIC_DIR);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      const inputPath = path.join(PUBLIC_DIR, file);
      const name = path.basename(file, ext);
      const outputPath = path.join(PUBLIC_DIR, `${name}.webp`);
      
      console.log(`🚀 Optimizing ${file}...`);
      
      try {
        const metadata = await sharp(inputPath).metadata();
        
        let pipeline = sharp(inputPath);
        
        // Resize if too large (above 1920px)
        if (metadata.width > 1920) {
          pipeline = pipeline.resize(1920);
        }
        
        await pipeline
          .webp({ quality: 75, effort: 6 })
          .toFile(outputPath);
          
        const oldSize = fs.statSync(inputPath).size;
        const newSize = fs.statSync(outputPath).size;
        console.log(`✅ Saved ${file} -> ${name}.webp (${Math.round((oldSize - newSize) / 1024 / 1024 * 100) / 100} MB reduced)`);
      } catch (err) {
        console.error(`❌ Failed to optimize ${file}:`, err.message);
      }
    }
  }
};

optimize();
