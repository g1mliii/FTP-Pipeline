const OPTIONAL_ENV_KEYS = [
  "APPDATA",
  "COMSPEC",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LOCALAPPDATA",
  "LOGNAME",
  "NUMBER_OF_PROCESSORS",
  "OS",
  "PATH",
  "PATHEXT",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "USERDOMAIN",
  "USERNAME",
  "USERPROFILE",
  "WINDIR"
] as const;

export const createChildProcessEnv = (overrides: NodeJS.ProcessEnv = {}) => {
  const env: NodeJS.ProcessEnv = {};

  for (const key of OPTIONAL_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) {
      env[key] = value;
    }
  }

  env.PWD = process.cwd();
  return {
    ...env,
    ...overrides
  };
};
