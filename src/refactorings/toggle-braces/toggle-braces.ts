import { Editor, ErrorReason } from "../../editor/editor";
import { Selection } from "../../editor/selection";
import * as t from "../../ast";
import { Position } from "../../editor/position";

export { toggleBraces, createVisitor };

async function toggleBraces(editor: Editor) {
  const { code, selection } = editor;
  const updatedCode = updateCode(t.parse(code), selection);

  if (!updatedCode.hasCodeChanged) {
    editor.showError(ErrorReason.DidNotFindStatementToToggleBraces);
    return;
  }

  await editor.write(updatedCode.code);
}

function updateCode(ast: t.AST, selection: Selection): t.Transformed {
  return t.transformAST(
    ast,
    createVisitor(
      selection,
      (path, toggleBraces) => {
        toggleBraces.execute();
        path.stop();
      },
      (path, toggleBraces) => {
        toggleBraces.execute();
        path.stop();
      }
    )
  );
}

function createVisitor(
  selection: Selection,
  onAddBracesMatch: (path: t.NodePath, toggleBraces: ToggleBraces) => void,
  onRemoveBracesMatch: (
    path: t.NodePath<t.IfStatement>,
    toggleBraces: ToggleBraces
  ) => void
): t.Visitor {
  return {
    IfStatement(path) {
      if (!selection.isInsidePath(path)) return;

      // Since we visit nodes from parent to children, first check
      // if a child would match the selection closer.
      if (hasChildWhichMatchesSelection(path, selection)) return;

      if (t.hasBraces(path, selection)) {
        if (!t.hasSingleStatementBlock(path, selection)) return;
        onRemoveBracesMatch(
          path,
          new RemoveBracesFromIfStatement(path, selection)
        );
      } else {
        onAddBracesMatch(path, new AddBracesToIfStatement(path, selection));
      }
    },
    JSXAttribute(path) {
      if (!selection.isInsidePath(path)) return;
      if (!t.isStringLiteral(path.node.value)) return;

      // Since we visit nodes from parent to children, first check
      // if a child would match the selection closer.
      if (hasChildWhichMatchesSelection(path, selection)) return;

      onAddBracesMatch(path, new AddBracesToJSXAttribute(path));
    },
    ArrowFunctionExpression(path) {
      if (!selection.isInsidePath(path)) return;
      if (t.isBlockStatement(path.node.body)) return;

      // Since we visit nodes from parent to children, first check
      // if a child would match the selection closer.
      if (hasChildWhichMatchesSelection(path, selection)) return;

      onAddBracesMatch(path, new AddBracesToArrowFunctionExpression(path));
    }
  };
}

function hasChildWhichMatchesSelection(
  path: t.NodePath,
  selection: Selection
): boolean {
  let result = false;

  path.traverse({
    IfStatement(childPath) {
      if (!selection.isInsidePath(childPath)) return;

      result = true;
      childPath.stop();
    },
    JSXAttribute(_childPath) {
      // SMELL: could a child match here?
    },
    ArrowFunctionExpression(childPath) {
      if (!selection.isInsidePath(childPath)) return;
      if (t.isBlockStatement(childPath.node.body)) return;

      result = true;
      childPath.stop();
    }
  });

  return result;
}

interface ToggleBraces {
  execute(): void;
}

class AddBracesToIfStatement implements ToggleBraces {
  constructor(
    private path: t.NodePath<t.IfStatement>,
    private selection: Selection
  ) {}

  execute() {
    if (!t.isSelectableNode(this.path.node.consequent)) return;

    const endOfConsequent = Position.fromAST(this.path.node.consequent.loc.end);

    if (this.selection.start.isBefore(endOfConsequent)) {
      this.path.node.consequent = t.statementWithBraces(
        this.path.node.consequent
      );
    } else if (this.path.node.alternate) {
      this.path.node.alternate = t.statementWithBraces(
        this.path.node.alternate
      );
    }
  }
}

class RemoveBracesFromIfStatement implements ToggleBraces {
  constructor(
    private path: t.NodePath<t.IfStatement>,
    private selection: Selection
  ) {}

  execute() {
    if (!t.isSelectableNode(this.path.node.consequent)) return;

    if (this.selection.isBefore(this.path.node.consequent)) {
      this.path.node.consequent = t.statementWithoutBraces(
        this.path.node.consequent
      );
    } else if (this.path.node.alternate) {
      this.path.node.alternate = t.statementWithoutBraces(
        this.path.node.alternate
      );
    }
  }
}

class AddBracesToJSXAttribute implements ToggleBraces {
  constructor(private path: t.NodePath<t.JSXAttribute>) {}

  execute() {
    if (!this.path.node.value) return;
    if (t.isJSXExpressionContainer(this.path.node.value)) return;

    this.path.node.value = t.jsxExpressionContainer(this.path.node.value);
  }
}

class AddBracesToArrowFunctionExpression implements ToggleBraces {
  constructor(private path: t.NodePath<t.ArrowFunctionExpression>) {}

  execute() {
    // Duplicate this type guard so TS can infer the type properly
    if (t.isBlockStatement(this.path.node.body)) return;

    const blockStatement = t.blockStatement([
      t.returnStatement(this.path.node.body)
    ]);
    this.path.node.body = blockStatement;
  }
}
