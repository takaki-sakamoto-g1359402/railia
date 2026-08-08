# Riai + Noa Phase 1 — 2026-08-09 作業終了記録

## 保存状態

- 最終ローカルGit commit: `408774c fix: harden phase 1 safety checkpoint`
- 基盤checkpoint: `e80c0e3 chore: checkpoint phase 1 safe mock foundation`
- branch: `main`
- worktree: clean
- Vite開発サーバー: 停止済み
- active goal: 未完了のまま保持

## 本日の到達点

- Riai／Noaの非破壊layer仕様、manual redraw checklist、提案Live2D model仕様を作成。
- browser-first TypeScript＋Viteの`MOCK / NOT LIVE2D`を実装。
- strict JSON Schema、5-action allowlist、character capability policy、queue／priority／interrupt、seeded idle、audit、replay、rate limit、emergency stopを実装。
- 独立安全監査6項目を修正: duplicate emergency reassert、runtime failure fail-closed、pre-validation attempt limit、oversize preallocation防止、time-based MOCK motion、observable replay eviction。
- 追加承認済みsecondary 9枚をhash付きで登録。すべてflattened scene artで、primaryを上書きせず、Cubism用分離partとして直接importしない。
- Computer UseでLive2D Cubism Editor 5.3.03（trial残り42日、empty project）を確認。PSD／model／exportは未作成・未変更。
- Live2D公式マニュアルでPSD条件、standard parameters、Web model bundle前提を再照合。

## 最終検証

- TypeScript typecheck: PASS
- Vitest: 5 files / 66 tests PASS
- Vite production build: PASS
- build size: JS 42.26 kB / gzip 10.93 kB、CSS 4.72 kB / gzip 1.81 kB
- Canvas safe-idle screenshot: 目視済み
- 全preset browser screenshot matrix: 未完了

## 次回の開始位置

1. README記載のbundled Node commandでVite serverを起動。
2. develop-web-game Playwright clientでcentral light、look-at-character、invalid rejection、emergency stopを実行。
3. 全screenshotを`view_image`で確認し、`state-*.json`とconsole/page errorなしを確認。
4. `408774c`の最終read-only diff／security auditを行い、typecheck、66+ tests、buildを再実行。
5. `docs/phase1-status.md`のbrowser行とacceptance結論を更新し、Phase 1最終commitを作成。
6. 実Cubism rigging、SDK、voice、lip-sync、LLM、Phase 2の直前で停止する。

## 継続blocker

- production-ready layered PSDとhidden-regionの人間再描画。
- `.cmo3`／`.moc3`／`.model3.json`／textures／motions／expressions／physics。
- secondary 9枚の一時Photos pathではないdurable originalsとhash再照合。
- rights／SDK Core／redistribution／commercial license判断。

Phase 1はまだ完了扱いではありません。本日の安全な再開点はcommit `408774c`です。
