import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runCommand(command, args = []) {
    try {
        const { stdout } = await execFileAsync(
            command,
            args,
        );
        return stdout;
    } catch (error) {
        throw new Error(
            error.stderr || error.message
        );
    }
}