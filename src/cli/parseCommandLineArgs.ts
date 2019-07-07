import minimist from "minimist";
import { CommandLineOptions } from "./CommandLineOptions";

export function parseCommandLineArgs(args: string[]): CommandLineOptions {
    const argv = minimist(args, {
        string: ["config"],
        boolean: ["help", "version", "outputFilePaths", "outputResolvedConfig"]
    });

    return {
        config: getConfigFilePath(),
        showHelp: argv["h"] || argv["help"],
        showVersion: argv["v"] || argv["version"],
        outputFilePaths: argv["outputFilePaths"],
        outputResolvedConfig: argv["outputResolvedConfig"],
        filePatterns: argv._
    };

    function getConfigFilePath() {
        return argv["c"] || argv["config"] || undefined as string | undefined;
    }
}
