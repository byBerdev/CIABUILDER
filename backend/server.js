const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const app = express();
const upload = multer({ dest: "uploads/" });

const PORT = 3000;

app.use(express.static("frontend"));

function run(cmd, cwd) {
  console.log(">>", cmd);
  execSync(cmd, { stdio: "inherit", cwd });
}

app.post(
  "/build",
  upload.fields([
    { name: "icon" },
    { name: "banner" }
  ]),
  (req, res) => {
    try {
      const name = req.body.name || "HomebrewApp";

      const buildDir = path.join(__dirname, "workspace", "build_" + Date.now());
      fs.mkdirSync(buildDir, { recursive: true });

      // arquivos enviados
      const iconPath = req.files.icon[0].path;
      const bannerPath = req.files.banner[0].path;

      const iconDest = path.join(buildDir, "icon.png");
      const bannerDest = path.join(buildDir, "banner.png");

      fs.renameSync(iconPath, iconDest);
      fs.renameSync(bannerPath, bannerDest);

      // cria main.c básico se não existir
      const mainC = `
#include <3ds.h>
#include <stdio.h>

int main() {
    gfxInitDefault();
    consoleInit(GFX_TOP, NULL);

    printf("${name} rodando!\\n");
    printf("Pressione START para sair");

    while (aptMainLoop()) {
        hidScanInput();
        if (hidKeysDown() & KEY_START) break;

        gfxFlushBuffers();
        gfxSwapBuffers();
        gspWaitForVBlank();
    }

    gfxExit();
    return 0;
}
`;
      fs.writeFileSync(path.join(buildDir, "main.c"), mainC);

      // 1. compilar ELF
      run(
        "arm-none-eabi-gcc main.c -o main.elf -I$DEVKITPRO/libctru/include -L$DEVKITPRO/libctru/lib -lctru",
        buildDir
      );

      // 2. icon
      run(
        "bannertool makesmdh -i icon.png -o icon.icn -s \"" + name + "\"",
        buildDir
      );

      // 3. banner
      run(
        "bannertool makebanner -i banner.png -o banner.bin",
        buildDir
      );

      // 4. CIA
      const outputCIA = path.join(buildDir, "output.cia");

      run(
        `makerom -f cia -o output.cia -target t -elf main.elf -icon icon.icn -banner banner.bin`,
        buildDir
      );

      res.download(outputCIA);

    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao buildar CIA");
    }
  }
);

app.listen(PORT, () => {
  console.log("CIA Builder rodando em http://localhost:" + PORT);
});
