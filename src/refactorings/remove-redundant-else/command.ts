import * as vscode from "vscode";

import { createCommand } from "../../commands";
import { removeRedundantElse } from "./remove-redundant-else";

// Must match `command` field in `package.json`
export const commandKey = "abracadabra.removeRedundantElse";

export default vscode.commands.registerCommand(
  commandKey,
  createCommand(removeRedundantElse)
);