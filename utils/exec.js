import { execFile } from "child_process";
import { promisify } from "util";
import { spawn } from "child_process";

const execFileAsync = promisify(execFile);

export async function runCommand(command, args = []) {

    try {

        const { stdout } = await execFileAsync(
            command,
            args,
            {
                maxBuffer: 1024 * 1024 * 20
            }
        );

        return stdout;

    } catch (error) {

        throw new Error(
            error.stderr || error.message
        );

    }

}