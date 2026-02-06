#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const src = path.join(__dirname, "..", "public", "icon.png");
const buildDir = path.join(__dirname, "..", "build");
const iconsDir = path.join(buildDir, "icons");

// Linux icon sizes (electron-builder expects filenames like 256x256.png)
const SIZES = [16, 32, 48, 64, 128, 256, 512];

async function main() {
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });

  // Copy main icon for electron-builder (win/mac)
  fs.copyFileSync(src, path.join(buildDir, "icon.png"));

  // Generate Linux icon set for reliable display in app menu, taskbar, Alt+Tab
  const buffer = await sharp(src).toBuffer();
  await Promise.all(
    SIZES.map((size) =>
      sharp(buffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `${size}x${size}.png`))
    )
  );

  // Also copy as icon.png in icons folder for compatibility
  fs.copyFileSync(src, path.join(iconsDir, "icon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
