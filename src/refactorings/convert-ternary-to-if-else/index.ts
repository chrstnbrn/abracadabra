import { commandKey } from "./command";
import {
  hasTernaryToConvert,
  convertTernaryToIfElse
} from "./convert-ternary-to-if-else";

import { RefactoringWithActionProvider } from "../../types";

const config: RefactoringWithActionProvider = {
  commandKey,
  operation: convertTernaryToIfElse,
  title: "Convert Ternary To If/Else",
  actionProviderMessage: "Convert ternary to if/else",
  canPerformRefactoring: hasTernaryToConvert
};

export default config;