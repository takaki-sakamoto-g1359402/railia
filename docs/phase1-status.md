# Phase 1 Status — Riai + Noa Safe Live2D PoC

## 結論

**条件付きGO。ただしPhase 1は未完了です。**

安全な高レベルCharacter Action API、Riai／Noa状態機械、runtime抽象化、可視Canvas `MOCK`、制作仕様書は実装済みです。2026-08-09 08:15 JSTのtypecheck、50/50 baseline tests、production buildは成功し、safe-idle Canvasも目視しました。一方、独立安全監査で6項目の未修正点が確認され、preset browser interactionも未完了です。したがってPhase 1完了は主張しません。

Live2D Cubism Editorは起動中で、人間から起動・使用の承認も得ています。しかし、分離PSDとリグ済みモデルは存在しません。Editorが動いていることは、Live2Dモデルが完成したことを意味しません。実モデル制作は引き続き **REQUIRES MANUAL LIVE2D WORK** です。

この文書は2026-08-09時点のワークスペーススナップショットです。実装や検証が更新された場合は、コマンド出力と実行日時を添えてこの表を更新してください。

## ステータス定義

| Label | 意味 |
| --- | --- |
| `IMPLEMENTED` | 対象ファイル／コードが現在のワークスペースに存在する |
| `PROTOTYPE` | 方向性検証用で、production hardening前 |
| `MOCK` | 抽象プレースホルダー。実Live2D asset／SDKを使用しない |
| `PENDING` | 必要な実行・目視・証拠取得が未完了。成功を主張しない |
| `REQUIRES MANUAL LIVE2D WORK` | 人間による作画、分離、Cubism Editor作業が必須 |
| `BLOCKED` | 外部入力／権利／asset／依存がないため、その工程を開始できない |
| `FUTURE WORK` | Phase 1の自動継続範囲外 |

## 環境・リポジトリ調査

| 項目 | 現在の証拠 | Status |
| --- | --- | --- |
| OS／hardware | macOS 15.6 (24G84)、arm64、Apple M2、8 GiB RAM | IMPLEMENTED / VERIFIED ENVIRONMENT |
| Live2D Editor | `/Applications/Live2D Cubism 5.3/Live2D Cubism Editor 5.3.app`、Editor processを確認。Phase 0記録は5.3.03 arm64 | IMPLEMENTED / RUNNING |
| Live2D Viewer | `/Applications/Live2D Cubism 5.3/Live2D Cubism Viewer 5.3.app` | IMPLEMENTED / INSTALLED |
| Live2D使用承認 | 人間から「Live2D 起動済み」と使用継続の承認あり | APPROVED FOR PHASE 1 INSPECTION |
| 通常PATH | `node`と`npm`は見つからず、pnpm fallback wrapperのみ検出 | MISSING FROM NORMAL PATH |
| Codex bundled runtime | Node `v24.14.0`、pnpm `11.16.0`を実行確認 | IMPLEMENTED |
| Git | Git 2.39.5、repository初期化済み、branch `main` | IMPLEMENTED |
| Git record | 調査時点でcommitはなく、プロジェクトファイルはuntracked | PENDING |
| dependency state | `pnpm-lock.yaml`、`node_modules/`あり | IMPLEMENTED; CLEAN INSTALL PENDING |
| build artifact | `dist/`あり。ただし存在だけでは現在ソースのbuild成功証拠にならない | PENDING |
| tests | 5 files / 50 Vitest casesあり | BASELINE PASS; AUDIT REGRESSION TESTS REQUIRED |
| app choice | browser-first TypeScript＋Vite。Electron／PixiJSなし | IMPLEMENTED |
| Cubism SDK for Web | package／Core／adapterなし | FUTURE WORK / BLOCKED FOR REAL RUNTIME |
| Live2D character assets | PSD、`.cmo3`、`.moc3`、`.model3.json`、textures、motions、expressions、physicsなし | REQUIRES MANUAL LIVE2D WORK |

## Feasibility

### Safe MOCK vertical slice

**Feasible / implementation foundation present.** Strict schema、bounded validator、安全policy、state machine、runtime adapter、Canvas MOCKのコードは存在します。実動証拠は`PENDING`なので、Phase 1 acceptanceはまだ通過していません。

### Real Live2D Riai + Noa

**Feasible after human art and licensed SDK gates.** 既存のprimary referenceから制作方針は定義できますが、flattened画像からproduction-ready分離PSDとリグを自動生成したとは主張できません。隠れ面再描画、レイヤー分離、Cubism rig、runtime exportは人間作業です。

### Production／commercial use

**Not yet ready.** SDK/Core再配布、Publication License、reference art権利、モデル配布範囲、永続audit、auth、パフォーマンス、asset QAが未確定です。

## リファレンスと原本保全

| Role | File | Authority / allowed use | Status |
| --- | --- | --- | --- |
| Riai primary | `image-9.png` | Riaiのidentity、visible silhouette、costume、face、hair、ears、tail、palette、accessoryの第一優先 | PRIMARY |
| Noa primary | `image-8.png` | Noaのidentity、visible anatomy、cloak、tail、crystalの第一優先 | PRIMARY |
| Scene only | `image-2.png` | central magical light、scene mood、external VFXのみ | OPTIONAL VFX REFERENCE |
| Riai secondary | `61763E84-1B87-4BCC-A441-EC301A931519.png` | visible upper body、hands、source-compatible robe／hair／tail supportのみ | APPROVED SECONDARY |
| Riai secondary | `A495E424-5AC6-46B7-A175-5EEC2DCA95D0.png` | visible side/three-quarter、back-hair／tail／robe silhouette supportのみ | APPROVED SECONDARY |
| Riai secondary | `64C6E4AE-5897-4312-8C5F-4945DDB467FF.png` | visible front/three-quarter、hands／robe／tail supportのみ | APPROVED SECONDARY |
| Riai secondary | `906B4389-AAAC-4E2E-BA10-9C74BDDE8C2F.png` | visible hood-up upper body、hands／hair／robe／tail supportのみ | APPROVED SECONDARY |
| Riai secondary | `5CDA02B7-035D-4D95-917E-64BD5B52254F.png` | visible hood-up full body、robe／footwear／hands／hair／tail supportのみ | APPROVED SECONDARY |
| Riai secondary | `84F4555E-7F66-43A9-A283-4F9031458D70.png` | visible seated pose、legs／footwear／hand／hood／robe／tail supportのみ | APPROVED SECONDARY |
| Riai secondary | `BFFCA8CB-CC4C-46EB-B5CA-36C185A9A2E5.png` | visible hood-up full-body silhouette、clasped hands／robe／hair／tail supportのみ | APPROVED SECONDARY |
| Riai + Noa secondary | `37B569B6-B960-4FEC-890D-0A77B13181A7.png` | visible relative compositionと、primary-compatibleなRiai／Noaの表面情報のみ | APPROVED SECONDARY |
| Riai + Noa secondary | `A69D0A24-1500-4515-99A6-EC8CD32430D9.png` | visible hood-up composition、robe／cloak／ears／tails／reaction moodのみ | APPROVED SECONDARY |

追加9枚はすべて不透明なflattened RGB PNG scene artです。8枚は1122×1402、`5CDA02B7-035D-4D95-917E-64BD5B52254F.png`は941×1672です。cut source、PSD layer、orthographic turnaroundではありません。Riaiは`image-9.png`、Noaは`image-8.png`を必ず優先し、背景、環境光、風、遠近、隠れ面は採用しません。

9枚の現在のPhotos `NSItemProvider`パスは一時的です。ファイル名／hashは [reference-policy.md](./reference-policy.md) に登録済みですが、production archiveへの利用は、人間がdurable originalを提供してhashを再照合するまで `BLOCKED` です。原本をコピー／変更／Cubism importしたとは主張しません。

## 実装済みアーキテクチャ

```text
Untrusted JSON
  -> CharacterActionValidator
  -> CharacterSafetyPolicy + ReplayGuard + SlidingWindowRateLimiter
  -> CharacterActionApi + bounded AuditLogger
  -> CharacterController
       -> Riai CharacterStateMachine
       -> Noa CharacterStateMachine
  -> CharacterRuntimeAdapter
       -> CanvasMockRuntime / RecordingMockRuntime [MOCK]
       -> CubismRuntimeAdapter                    [FUTURE WORK]
```

### 実装マップ

| Concern | Current file(s) | Status |
| --- | --- | --- |
| Action schema | `src/actions/character-action.schema.json` | IMPLEMENTED |
| Parse／structure／schema validation | `src/actions/validator.ts` | IMPLEMENTED; BEHAVIOR TEST PENDING |
| Capability／self-target／queue policy | `src/safety/policy.ts`, `src/characters/catalog.ts` | IMPLEMENTED; BEHAVIOR TEST PENDING |
| Rate limiting／replay guard | `src/safety/rate-limiter.ts`, `src/safety/replay-guard.ts` | IMPLEMENTED; BEHAVIOR TEST PENDING |
| Character Action API | `src/actions/character-action-api.ts` | IMPLEMENTED / PROTOTYPE |
| Priority／interrupt／queue／safe idle | `src/state/*` | IMPLEMENTED / PROTOTYPE; TEST PENDING |
| Runtime boundary | `src/runtime/runtime-adapter.ts` | IMPLEMENTED |
| Visible placeholder renderer | `src/mock/canvas-mock-runtime.ts` | MOCK; VISUAL QA PENDING |
| Audit logging | `src/logging/audit-logger.ts` | IMPLEMENTED; MEMORY ONLY |
| Browser UI | `index.html`, `src/main.ts`, `src/styles.css` | IMPLEMENTED / MOCK; BROWSER QA PENDING |
| Cubism adapter | none | FUTURE WORK |

## Safety boundary

### 実装されているコード境界

- 4096-byte input limit。
- 最大構造深さ6、最大構造ノード96、任意文字列256文字。
- `__proto__`、`prototype`、`constructor` keyを拒否。
- JSON Schemaは`additionalProperties: false`、coercion／default挿入なし。
- version 1、request ID 1〜64文字、1〜8 actions。
- action allowlistは`setExpression`、`lookAt`、`lookAtCharacter`、`playMotion`、`emergencyStop`のみ。
- character allowlistは`riai`／`noa`、座標は`-1..1`。
- character-specific expression／motion capabilities。
- duplicate accepted request、self-target、queue overflowを拒否。
- 既定rate limitは10秒あたりcost 12。character queueは各16。
- emergency stopは単独requestのみ許可し、両characterをneutral safe idleへ戻すコード経路。
- replay履歴128件、audit履歴100件のメモリ上限。
- high-level stateだけをruntime adapterへ渡し、raw Live2D parameterはAPI型に存在しない。

### 未実装／productionに不足する境界

- 明示的な非同期execution timeout。
- server-side validation、認証、tenant isolation、permission model。
- 永続・署名・耐改ざんaudit log。
- 外部network egress policy／credential vault integration。
- real Cubism parameterのstartup introspectionと実モデル値域照合。
- SDK/Core license／redistribution gateの自動検査。

## 検証マトリクス

`IMPLEMENTED`はコード存在を示し、挙動成功を示しません。未確認はすべて`PENDING`です。

| Requirement / command | Authoritative evidence required | Current result |
| --- | --- | --- |
| `pnpm typecheck` | current sourceに対するexit 0と実行ログ | PASS — 2026-08-09 08:15 JST、bundled Node 24.14.0 |
| `pnpm build` | current sourceに対するexit 0、fresh `dist/` | PASS — 2026-08-09 08:15 JST、Vite 8.2.1; JS 39.49 kB / gzip 10.14 kB |
| `pnpm test` | exit 0、valid／malformed／unknown／unsafe／state／priority／emergency／seed tests | BASELINE PASS — 5 files / 50 tests、2026-08-09 08:15 JST; independent safety audit findings remain open |
| Valid command | accepted audit、state transition、visible MOCK reaction | PENDING |
| Malformed JSON | renderer crashなし、`VALIDATION_REJECTED` | PENDING |
| Unknown property／action／character | fail closed、rejected audit | PENDING |
| Oversize／deep／dangerous-key input | bounded rejection、renderer継続 | PENDING |
| Capability／self-target rejection | `POLICY_REJECTED` | PENDING |
| Rate limit | cost超過時`RATE_LIMITED`、状態非変更 | PENDING |
| Priority／interrupt／queue | expected disposition、deterministic completion | PENDING |
| Emergency stop | queued actions clear、両者neutral safe idle、reset audit | PENDING |
| Same seed／same timeline | identical idle snapshots | PENDING |
| Browser UI | Riai／Noa placeholder、state、audit、preset反応を目視 | PARTIAL — safe-idle Canvas screenshot inspected; preset click timed out and remains PENDING |
| NOT LIVE2D honesty | SDK／modelなし、画面にMOCK表示 | CODE／UI TEXT IMPLEMENTED; BROWSER QA PENDING |
| Original artwork untouched | registered hashes match、no modified source | POLICY IMPLEMENTED; FINAL HANDOFF RECHECK PENDING |
| Real Live2D model | PSD、rig、runtime bundle、Viewer evidence | REQUIRES MANUAL LIVE2D WORK |

Build／baseline testsは通過しましたが、独立監査でemergency replay、runtime例外のpartial commit、rejected-flood rate bypass、oversize preallocation、step-dependent motion、replay evictionの未修正点が確認されています。さらにpreset browser interactionが未確認のため、Phase 1 success criteriaは未達です。正確な再開順は`progress.md`の`Resume here`を優先してください。

## 欠落依存・blocker

1. 追加secondary 9枚のdurable human-provided originals。
2. Riai／Noaの承認済みneutral pose、crop、hand／tail inclusion decision。
3. 隠れ面を人間が再描画した高解像度・透明・分離PSD。
4. Cubism Editorで作る`.cmo3`と、Viewer／runtime用`.moc3`、`.model3.json`、textures、physics、motions、expressions。
5. Live2D Cubism SDK for Web／Coreの取得、version pin、license／redistribution判断。
6. 独立安全監査6項目の修正とregression tests。
7. preset／rejection／emergencyを含むbrowser visual／interaction QA。
8. 検証済みの意図的Git checkpoint。関係ないファイルを混ぜないこと。

## Exact human next-step checklist

制作担当者は [manual-redraw-checklist.md](./manual-redraw-checklist.md) を唯一の作業チェックリストとして開き、[reference-policy.md](./reference-policy.md) と併用してください。

開始前の順序:

1. 追加secondary 9枚のdurable originalを、hashが維持された状態で提供する。
2. Riaiのfront-neutral upper-body、hood-down、両手／尾をcropへ含めるか承認する。
3. Noaのseated/front-oriented neutral cropと脚／前足／尾／cloak overlapを承認する。
4. 原画の改変、商用利用、モデル配布、SDK/Core再配布の権利を確認する。
5. [Riai layer spec](./riai-layer-spec.md) と [Noa layer spec](./noa-layer-spec.md) に従い、別々のversioned layered PSDを人間が制作する。
6. すべての`HUMAN REDRAW REQUIRED`を承認し、unknown regionは推測せず停止する。
7. checkerboard、solo-layer、extreme-overlap、縮小可読性、hashの受入チェックを完了する。
8. import-ready PSDとsource manifestを承認してからCubism作業の許可を出す。

コード受入担当者は`progress.md`の`Resume here`順に安全修正とregression testsを追加し、READMEのbundled-runtimeコマンドでtypecheck、build、test、browser QAを再実行して、この文書を証拠付きで更新してください。

## Recommended Phase 2 sequence

Phase 1の全`PENDING`が解消し、明示的な人間承認を受けた後だけ、次の順序で進めます。

1. **Source freeze** — durable originals、hash manifest、primary precedence、MVP crop／poseを固定。
2. **Riai art gate** — front-neutral upper-body PSDを手作業で分離・再描画し、checklistを通す。
3. **Noa art gate** — seated/front-neutral PSDを手作業で分離・再描画し、checklistを通す。
4. **Riai Cubism model** — PSD import、ArtMesh、deformer、standard parameter、bounded custom parameter、expressions、physics、motions。
5. **Riai export validation** — Viewerで`.model3.json` bundle、texture、motion、expression、physicsを確認。
6. **Noa Cubism model／export** —同じgateをNoaへ適用。Riai設定を無条件コピーしない。
7. **SDK gate** — official Cubism SDK for Web／Coreを取得し、version、hash、license、redistributable filesを記録。
8. **Adapter integration** —既存`CharacterRuntimeAdapter`へ`CubismRuntimeAdapter`を追加。raw parameterを外部APIへ公開しない。
9. **One-character integration first** — Riaiを接続・検証し、次にNoaを追加。両モデルの同時render、resource lifetime、context lossを検証。
10. **Deterministic interaction** — `central_light_discovery`を状態機械の高レベルsequenceとして実装し、scene VFXをcharacter texturesから分離。
11. **Performance／safety regression** — low-spec、memory、GPU、rate、emergency、model-missing fallback、auditを再検証。
12. **Separate approvals later** — voice／TTS／lip-sync／LLMはPhase 2完了後の別承認。自動開始しない。

## Stop conditions

次のいずれかで作業を停止し、人間判断を求めます。

- primary／secondaryが衝突する、または隠れ面を根拠から確定できない。
- source hashが登録値と一致しない、Photos temporary pathしかない、権利が未確認。
- layered PSDのmandatory part、透明、bleed、naming、pose approvalが不足。
- Cubism license／Core再配布条件が未確認。
- SDK／model versionが合わない、Viewer exportが開けない。
- validation／policy／emergency／determinism testが失敗する。
- AI出力がraw parameter、任意code、filesystem、credential、無制限networkを要求する。
- Phase 2、voice、lip-sync、LLM、公開／配布に対する明示承認がない。

Phase 1の停止点は、実Cubism rigging、SDK integration、voice、lip-sync、LLM integrationの直前です。`PENDING`検証を完了し、正確な人間承認を得るまでここを越えません。
