import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerZIP } from "@electron-forge/maker-zip";

const config: ForgeConfig = {
  packagerConfig: {
    name: "VideoSum",
    executableName: "videosum",
    icon: "./public/icon",
    appBundleId: "com.videosum.app",
    asar: true,
    osxSign: {},
    extraResource: [".next/standalone", ".next/static", "public"],
  },
  makers: [
    new MakerDMG({
      name: "VideoSum",
      icon: "./public/icon.icns",
      background: "./public/dmg-background.png",
      format: "ULFO",
    }),
    new MakerZIP({}, ["darwin"]),
  ],
  hooks: {
    prePackage: async () => {
      console.log("Building Next.js for production...");
      const { execSync } = await import("child_process");
      execSync("npm run build", { stdio: "inherit" });
    },
  },
};

export default config;
