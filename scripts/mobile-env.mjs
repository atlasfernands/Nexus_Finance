import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_WINDOWS_TOOLS_ROOT = "D:\\DevTools\\NexusAndroid";

function findLatestJdk(jdkRoot) {
  if (!existsSync(jdkRoot)) {
    return null;
  }

  const jdkDirs = readdirSync(jdkRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("jdk-"))
    .map((entry) => path.join(jdkRoot, entry.name))
    .sort()
    .reverse();

  return jdkDirs.find((jdkDir) => existsSync(path.join(jdkDir, "bin", "java.exe"))) ?? null;
}

function prependPath(env, entries) {
  const currentEntries = (env.Path || env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  const nextEntries = [...entries.filter(Boolean)];

  for (const entry of currentEntries) {
    if (!nextEntries.some((candidate) => candidate.toLowerCase() === entry.toLowerCase())) {
      nextEntries.push(entry);
    }
  }

  env.Path = nextEntries.join(path.delimiter);
  env.PATH = env.Path;
}

export function createMobileEnv(baseEnv = process.env) {
  const env = { ...baseEnv };

  if (process.platform !== "win32") {
    return env;
  }

  const toolsRoot = env.NEXUS_ANDROID_TOOLS_ROOT || DEFAULT_WINDOWS_TOOLS_ROOT;
  const sdkRoot = path.join(toolsRoot, "android-sdk");
  const jdkHome = env.JAVA_HOME && existsSync(env.JAVA_HOME) ? env.JAVA_HOME : findLatestJdk(path.join(toolsRoot, "jdk"));

  if (jdkHome) {
    env.JAVA_HOME = jdkHome;
  }

  if (existsSync(sdkRoot)) {
    env.ANDROID_HOME = sdkRoot;
    env.ANDROID_SDK_ROOT = sdkRoot;
  }

  env.GRADLE_USER_HOME = env.GRADLE_USER_HOME || path.join(toolsRoot, "gradle-home");
  env.ANDROID_USER_HOME = env.ANDROID_USER_HOME || path.join(toolsRoot, "android-user-home");
  env.ANDROID_AVD_HOME = env.ANDROID_AVD_HOME || path.join(toolsRoot, "android-avd");

  prependPath(env, [
    jdkHome ? path.join(jdkHome, "bin") : null,
    path.join(sdkRoot, "cmdline-tools", "latest", "bin"),
    path.join(sdkRoot, "platform-tools"),
    path.join(sdkRoot, "emulator"),
  ]);

  return env;
}
