const express = require("express");
const multer = require("multer");
const { execSync } = require("child_process");
const fs = require("fs");

const upload = multer({ dest: "workspace/" });
const app = express();

app.post("/build", upload.fields([
  { name: "icon" },
  { name: "banner" }
]), (req, res) => {

  const name = req.body.name;
  const icon = req.files.icon[0].path;
  const banner = req.files.banner[0].path;

  const workdir = "./workspace/build_" + Date.now();
  fs.mkdirSync(workdir);

  fs.writeFileSync(`${workdir}/name.txt`, name);

  // mover assets
  fs.renameSync(icon, `${workdir}/icon.png`);
  fs.renameSync(banner, `${workdir}/banner.png`);

  // build script
  execSync(`bash build.sh ${workdir}`);

  const cia = `${workdir}/out.cia`;

  res.download(cia);
});

app.listen(3000);
