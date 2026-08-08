# Riai + Noa Safe Character Action PoC

## 結論

このリポジトリは、Riai／Noaを将来Live2Dへ接続するための、安全な高レベルCharacter Action APIとブラウザ上の可視 `MOCK` を分離して検証するPhase 1 PoCです。

現時点の結論は **条件付きGO / Phase 1未完了** です。TypeScript＋Viteの基盤、厳格なJSON境界、状態機械、監査ログ、Canvasプレースホルダーは実装済みで、2026-08-09 08:15 JST時点のtypecheck、50/50 baseline tests、production buildは成功しました。ただし独立安全監査6項目とpreset browser interactionが未完了です。合格テストだけを根拠にPhase 1完了とは扱いません。

> **MOCK / NOT LIVE2D**  
> 画面に出るRiai／Noaは抽象的なラベル付きプレースホルダーです。分離PSD、Cubismリグ、`.moc3`、`.model3.json`、Live2D Cubism SDK、実テクスチャ、実モーション、表情、物理はロードされません。

詳細な完了／未完了判定は [Phase 1 status](docs/phase1-status.md) を参照してください。実制作を始める人は最初に [手作業・PSD受入チェックリスト](docs/manual-redraw-checklist.md) を使用してください。

## 現在の実装範囲

### IMPLEMENTED / PROTOTYPE / MOCK

- browser-firstのTypeScript＋Vite構成。Electron／PixiJSは追加していません。
- 5種類のみの高レベルアクション：`setExpression`、`lookAt`、`lookAtCharacter`、`playMotion`、`emergencyStop`。
- JSON Schema 2020-12＋Ajvによるstrict validation。
- キャラクター能力表、重複request拒否、self-target拒否、キュー容量、レート制限。
- Riai／Noa独立状態機械、優先度、割込み可否、決定論的seeded idle。
- `CharacterRuntimeAdapter`。現在の実装は `CanvasMockRuntime`／`RecordingMockRuntime` のみです。
- accepted／rejectedを記録する上限付きメモリ内audit log。
- Canvas上の抽象プレースホルダー、状態表示、拒否プリセット、emergency stopボタン。
- 非破壊リファレンスポリシー、Riai／Noaレイヤー仕様、Live2Dモデル仕様、手作業チェックリスト。

### REQUIRES MANUAL LIVE2D WORK

- Riaiの前向き中立上半身・フードダウン原画、隠れ面再描画、レイヤー分離PSD。
- Noaの座り・正面寄り中立原画、隠れ面再描画、レイヤー分離PSD。
- ArtMesh、デフォーマ、パラメータ、表情、モーション、物理のCubism Editor作業。
- Viewer確認とruntime bundle書き出し。

### FUTURE WORK / 現在未実装

- Live2D Cubism SDK for Web／Cubism Coreの導入とライセンス確認。
- 実モデルを読む `CubismRuntimeAdapter`。
- 実Live2D描画、髪／耳／尾／ローブ物理、実表情・実モーション。
- 音声、TTS、リップシンク、LLM接続。
- 永続・耐改ざんaudit、認証、サーバー境界、明示的な非同期処理timeout。

## アーキテクチャ

```text
Human / future LLM (untrusted JSON)
                |
                v
CharacterActionValidator
  - byte / depth / node / string bounds
  - strict JSON Schema; no unknown properties
                |
                v
CharacterSafetyPolicy
  - character capability allowlist
  - replay / self-target / queue / rate checks
                |
                v
CharacterActionApi
                |
                v
CharacterController
  +-- Riai CharacterStateMachine
  +-- Noa  CharacterStateMachine
                |
                v
CharacterRuntimeAdapter
  +-- CanvasMockRuntime       [MOCK, current]
  +-- CubismRuntimeAdapter    [FUTURE WORK]
```

AIが将来決めてよいのは「何を意図するか」だけです。具体的な補間、パラメータ値、優先度、割込み、復帰は決定論的なコードが担当します。raw Cubism parameter、任意JavaScript、任意shell、ファイル、credential、無制限networkをCharacter Action APIへ追加してはいけません。

## セットアップ

### 必要条件

- Node.js `>=24.14.0 <25`
- pnpm `11.16.0`
- macOS／Linuxのモダンブラウザ

通常のPATHにNodeとpnpmがある環境:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

開発サーバーは `http://127.0.0.1:5173` です。

### このMacのCodex同梱ランタイム

この環境では通常PATHに`node`／`npm`がありません。確認済みの同梱版はNode `v24.14.0`、pnpm `11.16.0`です。固定パスを使う場合:

```bash
RIAI_NODE_DIR="/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
RIAI_PNPM="/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm"

PATH="$RIAI_NODE_DIR:$PATH" "$RIAI_PNPM" install --frozen-lockfile
PATH="$RIAI_NODE_DIR:$PATH" "$RIAI_PNPM" dev
```

別ターミナルで受入確認を実行する場合:

```bash
RIAI_NODE_DIR="/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
RIAI_PNPM="/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm"

PATH="$RIAI_NODE_DIR:$PATH" "$RIAI_PNPM" typecheck
PATH="$RIAI_NODE_DIR:$PATH" "$RIAI_PNPM" build
PATH="$RIAI_NODE_DIR:$PATH" "$RIAI_PNPM" test
```

これらは実行手順であり、このREADMEは成功を主張しません。正確なコマンド出力、終了コード、実行日時を [Phase 1 status](docs/phase1-status.md) の`PENDING`行へ記録してからPhase 1完了と判定してください。

## MOCKデモの使い方

1. `pnpm dev`または上記同梱ランタイムで開発サーバーを起動します。
2. `http://127.0.0.1:5173`を開きます。
3. `Central-light reaction`、`Look at each other`、`Prove rejection`、`Emergency stop`を順に確認します。
4. JSON欄からallowlist内のactionだけを送ります。
5. character state、可視プレースホルダー、accepted／rejected auditが一致することを確認します。

入力例:

```json
{
  "version": 1,
  "requestId": "manual-demo-001",
  "actions": [
    {
      "action": "lookAtCharacter",
      "character": "riai",
      "target": "noa"
    }
  ]
}
```

## 安全境界

現在のコード上の境界:

- 入力は最大4096 byte、深さ6、構造ノード96、任意文字列256文字。
- envelopeはversion 1、request ID最大64文字、1リクエスト最大8 actions。
- `additionalProperties: false`。型変換、default注入、unknown action／characterを許可しません。
- `lookAt`座標は`-1..1`。
- 既定レートは10秒あたりaction cost 12、各キャラクターの待ちキューは最大16。
- accepted request IDのreplay guardは128件、auditは100件のメモリ上限。
- `emergencyStop`は単独actionのみ許可し、両キューを消去してneutral safe idleへ戻す設計です。
- UIは文字列を`textContent`で表示し、CSPは外部object／form送信等を抑制します。

制限:

- これは単一ブラウザ内PoCであり、production security boundaryではありません。
- auditとreplay stateはリロードで消えます。
- auth、権限分離、永続ログ、署名、サーバー側rate limit、明示的async timeoutは未実装です。
- baseline実行テストは50/50 PASSですが、`progress.md`の独立安全監査6項目に対する修正とregression testsは`PENDING`です。

## リファレンス方針

- Riai primary: `image-9.png`。
- Noa primary: `image-8.png`。
- central magical light／scene only: `image-2.png`。
- 追加承認済み資料9枚はsecondary supportのみで、Riaiの`image-9.png`／Noaの`image-8.png`を上書きしません。
  - `61763E84-1B87-4BCC-A441-EC301A931519.png`
  - `A495E424-5AC6-46B7-A175-5EEC2DCA95D0.png`
  - `64C6E4AE-5897-4312-8C5F-4945DDB467FF.png`
  - `906B4389-AAAC-4E2E-BA10-9C74BDDE8C2F.png`
  - `5CDA02B7-035D-4D95-917E-64BD5B52254F.png`
  - `84F4555E-7F66-43A9-A283-4F9031458D70.png`
  - `BFFCA8CB-CC4C-46EB-B5CA-36C185A9A2E5.png`
  - `37B569B6-B960-4FEC-890D-0A77B13181A7.png`
  - `A69D0A24-1500-4515-99A6-EC8CD32430D9.png`
- 9枚は不透明なflattened RGB scene artです。8枚は1122×1402、`5CDA...`のみ941×1672で、いずれもレイヤー素材／cut sourceではありません。
- 現在のPhotos `NSItemProvider`パスは一時的です。production archiveには人間がdurable originalを提供し、登録hashと再照合する必要があります。
- 背景、照明、風、遠近、隠れ面をキャラクター設計へ流用しません。

詳細は [reference-policy](docs/reference-policy.md)、[Riai layer spec](docs/riai-layer-spec.md)、[Noa layer spec](docs/noa-layer-spec.md) を参照してください。

## リポジトリ構成

```text
docs/                 art policy, layer/model specs, handoff status
src/actions/          schema, validation, high-level API
src/characters/       per-character capability allowlists
src/safety/           policy, rate limit, replay guard
src/state/            deterministic state machines and seeded idle
src/runtime/          runtime adapter contract and recording mock
src/mock/             visible Canvas MOCK runtime
src/logging/          bounded in-memory audit log
src/main.ts           browser wiring and deterministic test hooks
```

## Stop条件

Phase 1の`PENDING`検証が完了し、人間が明示承認するまで、次を開始しません。

- 実Cubismリグ、SDK/Core導入、実モデル接続。
- 原本の変更、隠れデザインの推測、未承認secondaryの採用。
- voice、TTS、lip-sync、LLM、外部network、公開／配布。

次の具体的な作業順は [Phase 1 status](docs/phase1-status.md) のPhase 2 roadmapに記載しています。
