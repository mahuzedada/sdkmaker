import makeSdk  from "./makeSdk";
makeSdk({
  swaggerPathOrContent: "http://localhost:7002/docs-json",
  packageName: "opxa-sdk",
  outputDir: "opxa-sdk"
}).then(() => console.log("Done!!"));
// makeSdk({
//   swaggerPathOrContent: "https://opxa-api.shipiru.com/docs-json",
//   packageName: "opxa-sdk",
//   outputDir: "opxa-sdk"
// }).then(() => console.log("Done!!"));
// makeSdk({
//   swaggerPathOrContent: "spec.json",
//   packageName: "omni-test",
//   outputDir: "omni-test"
// }).then(() => console.log("Done!!"));
