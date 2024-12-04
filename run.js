const makeSdk = require("./src/makeSdk");

makeSdk({
  urlOrStringContent: "https://api.handycrew.net/docs-json",
  packageName: "@handy-crew-sdk/ts",
}).then(() => console.log("Done!!"));
