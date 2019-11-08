import { commandKey } from "./command";
import {
  addBracesToArrowFunction,
  hasArrowFunctionToAddBraces
} from "./add-braces-to-arrow-function";

import { RefactoringWithActionProvider } from "../../types";

const config: RefactoringWithActionProvider = {
  commandKey,
  operation: addBracesToArrowFunction,
  title: "Add Braces to Arrow Function",
  actionProviderMessage: "Add braces to arrow function",
  canPerformRefactoring: hasArrowFunctionToAddBraces
};

export default config;