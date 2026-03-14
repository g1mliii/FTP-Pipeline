import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROUTE_FILE_PATTERN = /^route-(?!map).*\.json$/;

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const pathExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const loadRouteSpecs = async (designContext) => {
  const routeMap = (await pathExists(designContext.files.routeMap)) ? await readJson(designContext.files.routeMap) : { figmaRoutes: [] };
  const fileNames = (await readdir(designContext.normalizedDir)).filter((fileName) => ROUTE_FILE_PATTERN.test(fileName)).sort();

  const routes = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(designContext.normalizedDir, fileName);
      const spec = await readJson(filePath);
      const key = fileName.replace(/^route-/, "").replace(/\.json$/, "");
      const mapping =
        routeMap.figmaRoutes.find((item) => item.shopifyPath === spec.path) ??
        routeMap.figmaRoutes.find((item) => item.template?.endsWith(spec.handle)) ??
        null;

      return {
        fileName,
        filePath,
        key,
        spec,
        mapping,
        path: spec.path,
        template: mapping?.template ?? null,
        templateFamily: mapping?.template?.split(".")[0] ?? null
      };
    })
  );

  return {
    routeMap,
    routes
  };
};

export const routeTitle = (route) =>
  route.spec.heading ??
  route.spec.fallbackTitle ??
  route.spec.hero?.heading ??
  route.spec.meta?.name ??
  route.spec.handle;
