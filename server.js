const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const app = express();
const upload = multer({ dest: "uploads/" });

const PORT = 3000;

// serve frontend
app.use(express.static("frontend"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

function run(cmd, dir) {
  console.log(">>", cmd);
  execSync(cmd, { stdio: "inherit", cwd: dir });
}

app.post("/build",
  upload.fields([
    { name: "icon" },
    { name: "banner" }
  ]),
  (req, res) => {

    try {
      const name = req.body.name || "Homebrew";

      const buildDir = path.join(__dirname, "workspace", "build_" + Date.now());
      fs.mkdirSync(buildDir, { recursive: true });

      // mover arquivos
      const icon = req.files.icon[0].path;
      const banner = req.files.banner[0].path;

      fs.renameSync(icon, path.join(buildDir, "icon.png"));
      fs.renameSync(banner, path.join(buildDir, "banner.png"));

      // main.c automático
      fs.writeFileSync(
        path.join(buildDir, "main.c"),
`
#include <3ds.h>
#include <stdio.h>

int main() {
    gfxInitDefault();
    consoleInit(GFX_TOP, NULL);

    printf("${name}\\n");
    printf("Press START to exit");

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
`
      );

      // compile ELF
      run(
        "arm-none-eabi-gcc main.c -o main.elf -lctru",
        buildDir
      );

      // icon + banner (simplificado)
      run(
        `bannertool makesmdh -i icon.png -o icon.icn -s "${name}"`,
        buildDir
      );

      run(
        "bannertool makebanner -i banner.png -o banner.bin",
        buildDir
      );

      // CIA output
      const outCIA = path.join(buildDir, "out.cia");

      run(
        "makerom -f cia -o out.cia -target t -elf main.elf -icon icon.icn -banner banner.bin",
        buildDir
      );

      res.download(outCIA);

    } catch (err) {
      console.log(err);
      res.status(500).send("Erro no build");
    }
  }
);

app.listen(PORT, () => {
  console.log("Rodando em http://localhost:" + PORT);
});
