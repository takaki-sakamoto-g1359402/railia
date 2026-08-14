# Riai / Noa Live2D モデル仕様（Phase 1）

## 1. 文書ステータス

- 文書: `PROPOSED`
- Riai Cubism モデル制作: `REQUIRES MANUAL LIVE2D WORK`
- Noa Cubism モデル制作: `REQUIRES MANUAL LIVE2D WORK`
- Cubism SDK for Web 接続: `FUTURE WORK`
- 実モデルを使ったランタイム検証: `BLOCKED`（`.cmo3` / `.moc3` / `.model3.json` が未作成）

本書は、手作業で制作する2体の独立したCubismモデルと、将来の安全なRuntime Adapterとの契約を定義する。現時点ではLive2D用PSD、Cubismリグ、ランタイム書き出し、モーション、表情、物理、SDKのいずれも存在しない。本書にあるパラメータ、メッシュ、デフォーマ、物理、表情、モーションはすべて制作提案であり、実装済みではない。

数値範囲は初期制作と安全制御のための**推奨値**である。最終的なモデルパラメータの最小値・既定値・最大値は、実モデル書き出し後にRuntimeから列挙して検出し、キャラクターマニフェストの許可範囲およびアプリ側の固定ポリシーとの積集合だけを使用する。推奨値を実モデルの事実として扱ってはならない。

## 2. モデル境界と制作原則

| 項目 | Riai | Noa |
| --- | --- | --- |
| モデルID | `riai` | `noa` |
| 一次参照 | `image-9` | `image-8` |
| MVP構図 | 正面・中立・上半身、フードダウン（一次参照で成立する範囲） | 座位・正面寄り・中立 |
| Cubismモデル | 独立した `.cmo3` / `.moc3` / `.model3.json` | 独立した `.cmo3` / `.moc3` / `.model3.json` |
| 共有してよいもの | 命名規約、Action API、Adapterインターフェース | 命名規約、Action API、Adapterインターフェース |
| 共有してはいけないもの | ArtMesh、デフォーマ、物理設定、モデル内パラメータ実体 | ArtMesh、デフォーマ、物理設定、モデル内パラメータ実体 |

- RiaiとNoaは別々にロード、更新、破棄できること。片方の欠落や初期化失敗で、もう片方の安全な表示まで破壊しない。
- モデル内座標と画面配置は分離する。2体の位置、スケール、前後関係、中央光はシーン側が管理する。
- 中央の魔法光と背景はモデルテクスチャへ焼き込まず、原則として独立VFXにする。
- 一次参照に見えない形状、裏面、関節、衣装内部、尾の付け根を推測して確定しない。必要箇所は `HUMAN REDRAW REQUIRED` としてPSD側で解決する。
- 各ArtMeshは透明背景、十分な隠れ面、変形用の余白を持つ。元の参照画像は変更しない。
- 表情、モーション、物理が同じパラメータを競合して上書きしないよう、パラメータ所有者を明示する。

## 3. パラメータ契約

### 3.1 範囲の読み方

- **制作範囲**: Cubism Editorで最初に用意する推奨キーフォーム範囲。
- **既定値**: neutral poseでの推奨値。
- **初期安全範囲**: Action Adapterが使ってよい推奨範囲。実モデルの範囲がこれより狭い場合は実モデル側を優先する。
- **所有者**: そのパラメータへ最終的に値を出力する責任主体。複数所有者がある場合も、合成順を固定する。
- `条件付き` は、対応アートとリグが手作業で完成した場合だけマニフェストへ追加することを意味する。存在しないパラメータをダミーで作らない。

### 3.2 共通標準パラメータ

| Cubism ID | 用途 | 制作範囲 | 既定値 | 初期安全範囲 | Riai | Noa | 主所有者 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ParamAngleX` | 顔の左右向き | `-30..30` | `0` | `-20..20` | 必須 | 必須 | gaze / motion controller |
| `ParamAngleY` | 顔の上下向き | `-30..30` | `0` | `-15..15` | 必須 | 必須 | gaze / motion controller |
| `ParamAngleZ` | 顔の傾き | `-30..30` | `0` | `-8..8` | 必須 | 必須 | motion controller |
| `ParamEyeLOpen` | 左目の開閉 | `0..1` | `1` | `0..1` | 必須 | 必須 | blink / expression mixer |
| `ParamEyeROpen` | 右目の開閉 | `0..1` | `1` | `0..1` | 必須 | 必須 | blink / expression mixer |
| `ParamEyeBallX` | 両眼の左右視線 | `-1..1` | `0` | `-0.70..0.70` | 必須 | 必須 | gaze controller |
| `ParamEyeBallY` | 両眼の上下視線 | `-1..1` | `0` | `-0.55..0.55` | 必須 | 必須 | gaze controller |
| `ParamMouthOpenY` | 口の開き | `0..1` | `0` | `0..0.85` | 必須 | 必須 | mouth controller |
| `ParamMouthForm` | 口角・口形 | `-1..1` | `0` | `-0.80..0.80` | 必須 | 必須 | expression mixer |
| `ParamBodyAngleX` | 胴体の左右向き | `-10..10` | `0` | `-6..6` | 必須 | 必須 | motion controller |
| `ParamBodyAngleY` | 胴体の上下向き | `-10..10` | `0` | `-4..4` | 必須 | 推奨 | motion controller |
| `ParamBodyAngleZ` | 胴体の傾き | `-10..10` | `0` | `-4..4` | 必須 | 必須 | motion controller |
| `ParamBreath` | 呼吸位相 | `0..1` | `0` | `0..1` | 必須 | 必須 | seeded idle controller |

目の開閉は左右を分離してリグする。通常瞬きは同時開始を避ける微小な位相差を許可するが、表情による閉眼と瞬きは同じミキサーで合成し、値を二重加算しない。`ParamMouthOpenY` は発話状態または将来のリップシンクが所有し、LLM、表情ファイル、汎用モーションからフレーム単位で直接操作しない。

### 3.3 表情を支える推奨パラメータ

| Cubism ID | 用途 | 制作範囲 | 既定値 | 初期安全範囲 | Riai | Noa | 主所有者 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ParamBrowLY` / `ParamBrowRY` | 眉の上下 | `-1..1` | `0` | `-0.75..0.75` | 必須 | 条件付き | expression mixer |
| `ParamBrowLAngle` / `ParamBrowRAngle` | 眉の角度 | `-1..1` | `0` | `-0.75..0.75` | 必須 | 条件付き | expression mixer |
| `ParamBrowLForm` / `ParamBrowRForm` | 眉形状 | `-1..1` | `0` | `-0.65..0.65` | 推奨 | 条件付き | expression mixer |
| `ParamEyeLSmile` / `ParamEyeRSmile` | 笑顔時の目形 | `0..1` | `0` | `0..0.85` | 推奨 | 推奨 | expression mixer |

Noaの眉が一次参照上で独立部品として成立しない場合、眉パラメータを無理に追加しない。耳、瞼、目形、口形の組み合わせで読み取れる表情を設計する。

### 3.4 耳パラメータ

| Cubism ID | 用途 | 制作範囲 | 既定値 | 初期安全範囲 | Riai | Noa | 主所有者 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ParamEarLAngle` | 左耳の基部回転 | `-1..1` | `0` | `-0.65..0.65` | 必須 | 必須 | motion / idle controller |
| `ParamEarRAngle` | 右耳の基部回転 | `-1..1` | `0` | `-0.65..0.65` | 必須 | 必須 | motion / idle controller |
| `ParamEarLFold` | 左耳の倒れ・緊張 | `0..1` | `0` | `0..0.70` | 推奨 | 推奨 | expression mixer |
| `ParamEarRFold` | 右耳の倒れ・緊張 | `0..1` | `0` | `0..0.70` | 推奨 | 推奨 | expression mixer |
| `ParamEarLTwitch` | 左耳の短い反応 | `0..1` | `0` | `0..0.75` | 推奨 | 必須 | deterministic impulse controller |
| `ParamEarRTwitch` | 右耳の短い反応 | `0..1` | `0` | `0..0.75` | 推奨 | 必須 | deterministic impulse controller |

耳の回転・折れ・twitchを単一パラメータへ詰め込まない。twitchは0へ戻る有限時間の決定論的インパルスとし、無制限に蓄積させない。

### 3.5 尾パラメータ

| Cubism ID | 用途 | 制作範囲 | 既定値 | 初期安全範囲 | Riai | Noa | 主所有者 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ParamTailBaseX` | 尾の基部左右 | `-1..1` | `0` | `-0.70..0.70` | 条件付き | 必須 | motion / idle controller |
| `ParamTailBaseY` | 尾の基部上下 | `-1..1` | `0` | `-0.50..0.60` | 条件付き | 必須 | motion / idle controller |
| `ParamTailCurl` | 尾全体の巻き | `-1..1` | `0` | `-0.60..0.60` | 条件付き | 推奨 | expression / motion controller |
| `ParamTailTipX` | 尾先の遅れ左右 | `-1..1` | `0` | `-0.65..0.65` | 条件付き | 必須 | physics output only |
| `ParamTailTipY` | 尾先の遅れ上下 | `-1..1` | `0` | `-0.50..0.50` | 条件付き | 必須 | physics output only |

RiaiのMVP参照またはPSDで尾と付け根が十分に存在しない場合、尾は `HUMAN REDRAW REQUIRED` のままモデル範囲外とする。Noaも付け根や隠れ面を推測で補完しない。`Base` はモーション入力、`Tip` は物理出力に分け、同じパラメータをモーションと物理で競合させない。

### 3.6 髪・衣装パラメータ

| Cubism ID | 用途 | 制作範囲 | 既定値 | 初期安全範囲 | Riai | Noa | 主所有者 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ParamHairFrontX` | 前髪の二次揺れ | `-1..1` | `0` | `-0.55..0.55` | 必須 | 対象外 | physics output only |
| `ParamHairFrontY` | 前髪の上下遅れ | `-1..1` | `0` | `-0.45..0.45` | 必須 | 対象外 | physics output only |
| `ParamHairSideLX` | 左横髪の二次揺れ | `-1..1` | `0` | `-0.65..0.65` | 必須 | 対象外 | physics output only |
| `ParamHairSideRX` | 右横髪の二次揺れ | `-1..1` | `0` | `-0.65..0.65` | 必須 | 対象外 | physics output only |
| `ParamHairBackX` | 後髪の二次揺れ | `-1..1` | `0` | `-0.60..0.60` | 推奨 | 対象外 | physics output only |
| `ParamHairBackY` | 後髪の上下遅れ | `-1..1` | `0` | `-0.45..0.45` | 推奨 | 対象外 | physics output only |
| `ParamRobeSwingX` | ローブ裾・前面の左右揺れ | `-1..1` | `0` | `-0.55..0.55` | 必須 | 対象外 | physics output only |
| `ParamRobeSwingY` | ローブの上下遅れ | `-1..1` | `0` | `-0.40..0.40` | 推奨 | 対象外 | physics output only |
| `ParamRobeSleeveL` | 左袖の遅れ | `-1..1` | `0` | `-0.50..0.50` | 条件付き | 対象外 | physics output only |
| `ParamRobeSleeveR` | 右袖の遅れ | `-1..1` | `0` | `-0.50..0.50` | 条件付き | 対象外 | physics output only |
| `ParamCloakSwingX` | Noaのクローク左右揺れ | `-1..1` | `0` | `-0.50..0.50` | 対象外 | 必須 | physics output only |
| `ParamCloakSwingY` | Noaのクローク上下遅れ | `-1..1` | `0` | `-0.35..0.35` | 対象外 | 推奨 | physics output only |

物理出力専用パラメータはAction APIへ公開しない。物理入力は頭・体・呼吸などの検証済み状態からのみ取得し、AI入力を物理へ直接渡さない。

### 3.7 クリスタル・アクセサリーパラメータ

| Cubism ID | 用途 | 制作範囲 | 既定値 | 初期安全範囲 | Riai | Noa | 主所有者 |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ParamCrystalGlow` | クリスタル発光強度 | `0..1` | `0.20` | `0..0.85` | 条件付き | 必須 | effects controller |
| `ParamCrystalPulse` | 発光パルス位相 | `0..1` | `0` | `0..1` | 条件付き | 推奨 | seeded effects oscillator |
| `ParamCrystalSwayX` | 吊り下げ結晶等の左右遅れ | `-1..1` | `0` | `-0.45..0.45` | 条件付き | 対象外 | physics output only |
| `ParamAccessorySwayL` | 左アクセサリーの遅れ | `-1..1` | `0` | `-0.45..0.45` | 条件付き | 対象外 | physics output only |
| `ParamAccessorySwayR` | 右アクセサリーの遅れ | `-1..1` | `0` | `-0.45..0.45` | 条件付き | 対象外 | physics output only |

`ParamCrystalGlow` はArtMeshの不透明度、加算発光用ArtMesh、またはシーン側VFXとの合成係数へマッピングする。WebGLシェーダーや任意コードをモデルマニフェストから指定できる設計にはしない。中央光への反応はAction/Interaction Controllerが決定し、クリスタル値をLLMへ直接公開しない。

## 4. ArtMesh設計

以下の三角形数は初期見積もりであり、原画解像度、変形量、マスク境界を見て手作業で調整する。細分化そのものを品質とみなさず、まずデフォーマで大変形を作り、ArtMeshは局所変形とシルエット維持に使う。

### 4.1 共通メッシュ方針

- 目、瞼、口、耳、指、尾の付け根など高変形部へ均等で変形方向に沿うエッジを置く。
- 不透明な内部へ無駄な頂点を増やさず、外周シルエット、マスク境界、色境界へ密度を寄せる。
- 前後で交差する髪束、袖、尾、クロークはArtMeshを分離し、単一メッシュを無理に折り返さない。
- 閉眼、開口、顔向きで必要になる隠れ面が無ければ、メッシュで引き延ばさず `HUMAN REDRAW REQUIRED` とする。
- クリッピングマスクは目、口腔など必要箇所に限定し、同一目的のマスクを可能な範囲で共有する。マスク反転や過剰な多重マスクへ依存しない。
- テクスチャ境界に十分な透明パディングを確保し、最大変形時のサンプリング漏れを防ぐ。

### 4.2 Riai 推奨メッシュ

| 部位 | 初期目安 | 変形上の要点 |
| --- | ---: | --- |
| 顔ベース | 250–450 tris | 頬、顎、こめかみへ放射状の流れ。顔XYで輪郭を潰さない |
| 眼球・虹彩・ハイライト | 各24–64 tris | 楕円変形と視線移動。ハイライトは眼球追従量を調整可能にする |
| 上下瞼 | 各40–90 tris | 完全閉眼時に白目が漏れず、まつ毛シルエットを保つ |
| 口部品 | 各30–80 tris | 閉口、開口、口角、母音寄り形状を破綻なく補間する |
| 前髪の大区分 | 各120–300 tris | 顔向きと物理揺れを分離。瞳を隠す束は個別分離を優先 |
| 可動髪束 | 各40–120 tris | 根元は安定、毛先ほど変形量を増やす |
| 後髪 | 各150–350 tris | 首・肩との重なり、左右向き、遅れを確保 |
| 狐耳 | 各80–180 tris | 基部回転と先端しなりを分離。内耳は外耳へ追従 |
| 首・胴体・肩 | 各150–400 tris | 頭と胴の二重変形を避け、肩線を維持 |
| 腕・手 | 各100–280 tris | 見えている関節だけを対象にし、隠れ面は再描画後に作る |
| ローブ主要パネル | 各180–450 tris | 前後関係を分け、裾方向へ流れるメッシュにする |
| 袖・装飾布 | 各100–280 tris | 腕の主変形と二次揺れを別デフォーマにする |
| 尾 | 250–550 tris | 付け根から先端へ流れる長手方向の分割。アート成立時のみ |
| 結晶・アクセサリー | 各20–100 tris | 発光用複製ArtMeshと本体を分け、輪郭を不必要に変形しない |

### 4.3 Noa 推奨メッシュ

| 部位 | 初期目安 | 変形上の要点 |
| --- | ---: | --- |
| 顔・頭部 | 220–400 tris | 立体感を壊さず、顔向きと耳基部を分離する |
| 眼球・虹彩・ハイライト | 各24–60 tris | 小サイズでも閉眼と視線の輪郭が崩れない密度 |
| 上下瞼 | 各35–80 tris | 毛並みシルエットを保った閉眼を作る |
| 口部品 | 各25–70 tris | 小さな形状で過度に開かず、閉口時の線幅を保つ |
| 狐耳 | 各80–170 tris | angle、fold、twitchを分離する |
| 胴体 | 220–450 tris | 呼吸と小さな前後・左右姿勢変化を吸収する |
| 前脚・後脚・足先 | 各80–220 tris | 座位の接地を守る。隠れた脚を一次参照から推測しない |
| クローク | 各160–400 tris | 胴体から分離し、裾の遅れと前後重なりを維持する |
| 尾 | 260–560 tris | 大きなシルエットを保ち、基部と先端の位相を分ける |
| 額クリスタル | 30–100 tris | 頭部追従。本体と発光ArtMeshを分離する |

## 5. デフォーマ階層

名前はCubism Editor内の推奨表示名であり、Runtimeはデフォーマ名へ依存しない。親から子への責任を一方向にし、同じ顔向き変形を複数階層へ重複適用しない。

### 5.1 Riai

```text
D_Riai_Root [Warp: placement-neutral]
└─ D_Riai_BodyZ [Rotation: ParamBodyAngleZ]
   └─ D_Riai_BodyXY [Warp: ParamBodyAngleX/Y]
      ├─ D_Riai_Torso [Warp: breath / posture]
      │  ├─ D_Riai_ShoulderL / D_Riai_ShoulderR
      │  │  └─ D_Riai_ArmL / D_Riai_ArmR
      │  │     └─ D_Riai_HandL / D_Riai_HandR
      │  ├─ D_Riai_RobeGlobal
      │  │  ├─ D_Riai_RobeFront / D_Riai_RobeBack
      │  │  └─ D_Riai_SleeveL / D_Riai_SleeveR
      │  └─ D_Riai_TailBase [Rotation]
      │     └─ D_Riai_TailMid [Rotation]
      │        └─ D_Riai_TailTip [Warp]
      └─ D_Riai_Neck [Rotation]
         └─ D_Riai_HeadZ [Rotation: ParamAngleZ]
            └─ D_Riai_HeadXY [Warp: ParamAngleX/Y]
               ├─ D_Riai_Face
               │  ├─ D_Riai_BrowL / D_Riai_BrowR
               │  ├─ D_Riai_EyeL / D_Riai_EyeR
               │  └─ D_Riai_Mouth
               ├─ D_Riai_EarBaseL / D_Riai_EarBaseR [Rotation]
               │  └─ D_Riai_EarFlexL / D_Riai_EarFlexR [Warp]
               ├─ D_Riai_HairFrontGlobal
               │  └─ D_Riai_HairFront_<strand>
               ├─ D_Riai_HairSideL / D_Riai_HairSideR
               ├─ D_Riai_HairBackGlobal
               └─ D_Riai_CrystalAnchor_<name>
                  └─ D_Riai_CrystalGlow_<name>
```

尾、腕、手、袖、結晶のうち一次参照で素材が成立しない枝は作らない。再描画完了後に該当枝を追加する。

### 5.2 Noa

```text
D_Noa_Root [Warp: placement-neutral]
└─ D_Noa_BodyZ [Rotation: ParamBodyAngleZ]
   └─ D_Noa_BodyXY [Warp: ParamBodyAngleX/Y]
      ├─ D_Noa_Body [Warp: breath / seated posture]
      │  ├─ D_Noa_LegFrontL / D_Noa_LegFrontR
      │  ├─ D_Noa_LegBackL / D_Noa_LegBackR
      │  ├─ D_Noa_CloakGlobal
      │  │  ├─ D_Noa_CloakFront / D_Noa_CloakBack
      │  │  └─ D_Noa_CloakHem
      │  └─ D_Noa_TailBase [Rotation]
      │     └─ D_Noa_TailMid [Rotation]
      │        └─ D_Noa_TailTip [Warp]
      └─ D_Noa_Neck [Rotation]
         └─ D_Noa_HeadZ [Rotation: ParamAngleZ]
            └─ D_Noa_HeadXY [Warp: ParamAngleX/Y]
               ├─ D_Noa_Face
               │  ├─ D_Noa_EyeL / D_Noa_EyeR
               │  └─ D_Noa_Mouth
               ├─ D_Noa_EarBaseL / D_Noa_EarBaseR [Rotation]
               │  └─ D_Noa_EarFlexL / D_Noa_EarFlexR [Warp]
               └─ D_Noa_ForeheadCrystal
                  └─ D_Noa_ForeheadCrystalGlow
```

座位の足先と尾の接地点はルートや呼吸で滑らせない。必要なら接地ArtMeshを体の呼吸デフォーマ外へ分離し、上体だけに呼吸量を配分する。

## 6. 物理グループ

物理設定は `REQUIRES MANUAL LIVE2D WORK`。以下はCubism Physicsへ実装する提案であり、実測値ではない。

| Group ID | 対象 | 入力候補 | 出力 | 初期方針 |
| --- | --- | --- | --- | --- |
| `Physics_Riai_HairFront` | Riai前髪 | `ParamAngleX/Y`, `ParamBodyAngleX` | `ParamHairFrontX/Y` | 軽量、短い遅れ、振幅小 |
| `Physics_Riai_HairSideL` | Riai左横髪 | `ParamAngleX/Z`, `ParamBodyAngleX` | `ParamHairSideLX` | 前髪より遅く減衰強め |
| `Physics_Riai_HairSideR` | Riai右横髪 | `ParamAngleX/Z`, `ParamBodyAngleX` | `ParamHairSideRX` | 左右を完全同値にせず調整 |
| `Physics_Riai_HairBack` | Riai後髪 | `ParamAngleX/Y`, `ParamBodyAngleX/Z` | `ParamHairBackX/Y` | 重め、長い遅れ、過振幅防止 |
| `Physics_Riai_Robe` | ローブ主要布 | `ParamBodyAngleX/Y/Z`, `ParamBreath` | `ParamRobeSwingX/Y` | 呼吸入力を弱くし、連続振動を防ぐ |
| `Physics_Riai_Sleeves` | 袖 | `ParamBodyAngleX/Z` | `ParamRobeSleeveL/R` | 腕アート成立時のみ |
| `Physics_Riai_TailTip` | Riai尾先 | `ParamTailBaseX/Y`, `ParamBodyAngleZ` | `ParamTailTipX/Y` | 尾アート成立時のみ。基部は物理出力にしない |
| `Physics_Riai_Accessories` | 吊り下げ装飾 | `ParamAngleX/Z`, `ParamBodyAngleX/Z` | `ParamCrystalSwayX`, `ParamAccessorySwayL/R` | 部品が独立している場合のみ |
| `Physics_Noa_Cloak` | Noaクローク | `ParamBodyAngleX/Y/Z`, `ParamBreath` | `ParamCloakSwingX/Y` | 接地部を動かし過ぎない |
| `Physics_Noa_TailTip` | Noa尾先 | `ParamTailBaseX/Y`, `ParamBodyAngleZ` | `ParamTailTipX/Y` | 大きな尾は低周波、振幅制限を厳格化 |

物理グループのQC条件:

- 60 / 30 / 20 fps相当および大きなフレーム時間変動で、NaN、発散、瞬間的な反転を起こさない。
- idle開始、motion割込み、emergency stop、タブ復帰時に安全に再初期化または減衰できる。
- 入力と出力を同一パラメータへ循環接続しない。
- 左右非同期性はseedまたは固定設定から再現できる。毎回異なるランダム値を物理設定そのものへ注入しない。
- 値が実モデル上限へ張り付く場合、出力倍率を下げる。Runtime側clampだけで見た目の破綻を隠さない。

## 7. 表情セット

表情IDはAPIの安定したaliasであり、ファイル名やCubism内部の並び順を外部へ公開しない。`.exp3.json` はモデル完成後に手作業で作る。fade-in / fade-outの初期推奨値は通常 `0.15–0.30s`、surprisedは `0.08–0.18s`、neutral復帰は `0.20–0.35s` とし、実機で調整する。

### 7.1 Riai

| Expression alias | 主な意図 | 推奨調整 | 注意 |
| --- | --- | --- | --- |
| `neutral` | 安全な基準顔 | 全表情オフセットを0、目開き1、口閉じ | emergency stopの復帰先 |
| `happy` | 穏やかな喜び | 口形を正、eye smileを弱〜中、眉を少し上げる | 常時閉眼にしない |
| `surprised` | 光や出来事への驚き | 目を開く、眉上げ、口を小さく開く | `ParamMouthOpenY`は短い演出値のみ。発話と競合時はmouth controller優先 |
| `thinking` | 思考・検討 | 眉の左右差、視線を僅かに外す、口形を僅かに負 | 視線移動はgaze controllerが実行 |
| `concerned` | 心配・警戒 | 眉内側上げ、耳を僅かに伏せ、口形を負 | 過度な耳折れを避ける |
| `speaking` | 発話中の基調 | 目・眉・口角のみ | 口開閉を表情ファイルへ固定しない |
| `listening` | Noaまたは相手へ注意 | 目を少し開き、耳を相手側へ寄せる | 相手方向の解決はAdapter / controller側 |

### 7.2 Noa

| Expression alias | 主な意図 | 推奨調整 | 注意 |
| --- | --- | --- | --- |
| `neutral` | 安全な基準顔 | 全表情オフセットを0、目開き1、口閉じ | emergency stopの復帰先 |
| `happy` | 親しみ・喜び | 口形を正、eye smile、耳を僅かに立てる | 尾は表情で直接駆動せずmotion側へ |
| `surprised` | 急な反応 | 目を開く、口を小さく開く、両耳twitch | twitchは有限インパルスとしてcontrollerが実行 |
| `curious` | 光・Riaiへの興味 | 片耳角度、軽い頭傾き、目を少し開く | 頭傾きと視線はcontrollerが実行 |
| `concerned` | 心配・不安 | 目形を弱く下げ、耳を僅かに伏せ、口形を負 | 額クリスタルを自動で暗くする場合はeffects controllerが合成 |

表情ファイルが変更してよいのは、マニフェストに表情所有として宣言したパラメータだけに限定する。`ParamAngle*`、`ParamBodyAngle*`、視線、尾の物理出力を表情ファイルへ混在させない。

## 8. モーションセットと命名

本節のCubism asset aliasは小文字snake_case、Cubism motion groupはPascalCase、ファイルは小文字snake_caseと連番で統一する。Character Action API v1が受け取る公開motion IDとの対応は8.3で別途固定する。ファイル名にキャラクター名を重複させる必要はない（モデルディレクトリで分離済み）。

### 8.1 Riai

| Cubism asset alias | Cubism group | 推奨ファイル | priority | interruptible | 用途 |
| --- | --- | --- | ---: | --- | --- |
| `idle_primary` | `Idle` | `motions/idle_01.motion3.json` | 0 | yes | 呼吸・僅かな姿勢変化 |
| `idle_observe` | `Idle` | `motions/idle_observe_01.motion3.json` | 0 | yes | 周囲を観察する短いidle variation |
| `notice_light` | `React` | `motions/notice_light_01.motion3.json` | 40 | yes | 中央光に気付く頭・体の反応 |
| `look_to_noa` | `React` | `motions/look_to_noa_01.motion3.json` | 30 | yes | Noa側へ体勢を寄せる補助。正確な視線はgaze controller |
| `listen` | `React` | `motions/listen_01.motion3.json` | 20 | yes | listening状態の小さな姿勢変化 |
| `speak_gesture_soft` | `Talk` | `motions/speak_gesture_soft_01.motion3.json` | 20 | yes | 発話中の控えめなジェスチャー。口開閉は含めない |
| `think` | `React` | `motions/think_01.motion3.json` | 25 | yes | thinkingの姿勢補助 |
| `recenter` | `System` | `motions/recenter_01.motion3.json` | 90 | no | neutralへ短時間で安全復帰する補助 |

### 8.2 Noa

| Cubism asset alias | Cubism group | 推奨ファイル | priority | interruptible | 用途 |
| --- | --- | --- | ---: | --- | --- |
| `idle_primary` | `Idle` | `motions/idle_01.motion3.json` | 0 | yes | 座位の呼吸・僅かな重心変化 |
| `idle_tail` | `Idle` | `motions/idle_tail_01.motion3.json` | 0 | yes | 低振幅の尾基部動作 |
| `ear_twitch` | `React` | `motions/ear_twitch_01.motion3.json` | 15 | yes | 片耳または両耳の短い反応 |
| `tail_wag_soft` | `React` | `motions/tail_wag_soft_01.motion3.json` | 20 | yes | 喜び・関心を表す小さな尾動作 |
| `notice_riai` | `React` | `motions/notice_riai_01.motion3.json` | 30 | yes | Riaiに気付く姿勢変化 |
| `notice_light` | `React` | `motions/notice_light_01.motion3.json` | 40 | yes | 中央光へ向く姿勢変化 |
| `curious_tilt` | `React` | `motions/curious_tilt_01.motion3.json` | 25 | yes | 好奇心の頭傾き |
| `recenter` | `System` | `motions/recenter_01.motion3.json` | 90 | no | neutralへ短時間で安全復帰する補助 |

priority値はアプリの提案値でありCubism SDKのmotion priority定数そのものとはみなさない。Runtime Adapterが自分の優先度モデルからSDKの予約・開始方式へ明示変換する。`emergencyStop` はpriority比較を迂回できる唯一のシステム操作で、キューを破棄して安全状態へ戻す。

blink、breath、bounded gaze driftは再利用モーションファイルへ固定せず、seeded idle controllerが安全範囲内で生成する。髪、ローブ、クローク、尾先は物理が受け持つ。これによりidleモーション同士の同期と、全パラメータの一枚モーション化を避ける。

### 8.3 Character Action API v1 crosswalk

公開APIのmotion ID、アプリ内priority、duration、interruptibleの唯一の実装上の正本は `src/actions/types.ts` の `MOTION_CONTRACT_V1` とする。`src/state/action-priority.ts` はこの定義を直接参照し、別のmotion priority表を持たない。8.1／8.2は将来手作業で作るCubism資産のインベントリであり、表中のpriorityは資産制作側の提案値で、下表のアプリ内スケジューラpriorityとは別レイヤーである。

| Character Action API v1 motion ID | Riai Cubism asset alias | Noa Cubism asset alias | app priority | duration ms | interruptible | v1の意味 |
| --- | --- | --- | ---: | ---: | --- | --- |
| `idle` | `idle_primary` | `idle_primary` | 60 | 1 | yes | 明示動作を1 tickで解放し、seeded safe idleへ戻す要求 |
| `greet` | — | — | 50 | 1200 | yes | Phase 1 MOCKのみ。両キャラクターとも専用資産aliasを今後追加する |
| `listen` | `listen` | — | 45 | 1500 | yes | Riaiは直接対応。Noaは専用資産aliasを今後追加する |
| `reactLight` | `notice_light` | `notice_light` | 80 | 1800 | no | 中央光への優先反応。完了まで通常動作で割り込まない |
| `earTwitch` | — | `ear_twitch` | 25 | 650 | yes | Noaは直接対応。Riaiは専用資産ができるまでMOCKのみ |
| `tailSway` | — | `tail_wag_soft` | 25 | 1000 | yes | Noaの低振幅の尾反応。Riaiは専用資産ができるまでMOCKのみ |

`—` は意図的な未対応を表す。将来の実Live2D Runtime Adapterは、`cubismAssetAliases` が `null` の組み合わせを別の似たmotionへ黙って置換せず、資産追加と契約更新が完了するまでfail closedにする。これにより、Phase 1 MOCKで許可された共通motion IDと、手作業で制作する2体別々のCubism資産を混同しない。

## 9. ランタイム書き出しとマニフェスト契約

### 9.1 キャラクターごとの期待ディレクトリ

以下は将来の書き出し形であり、現時点ではファイルを作成しない。

```text
characters/
├─ riai/
│  ├─ riai.model3.json
│  ├─ riai.moc3
│  ├─ character-manifest.json
│  ├─ textures/
│  │  └─ texture_00.png
│  ├─ expressions/
│  │  └─ <alias>.exp3.json
│  ├─ motions/
│  │  └─ <motion>_<nn>.motion3.json
│  └─ physics/
│     └─ riai.physics3.json
└─ noa/
   ├─ noa.model3.json
   ├─ noa.moc3
   ├─ character-manifest.json
   ├─ textures/
   │  └─ texture_00.png
   ├─ expressions/
   │  └─ <alias>.exp3.json
   ├─ motions/
   │  └─ <motion>_<nn>.motion3.json
   └─ physics/
      └─ noa.physics3.json
```

`pose3.json`、`userdata3.json`、`cdi3.json` は実際に必要な場合だけ追加する。アプリは存在を仮定しない。`.cmo3`、原寸PSD、作業用テクスチャは制作ソースであり、公開ランタイムbundleへ含めるかどうかを配布・ライセンス方針で別途判断する。

### 9.2 `character-manifest.json` の必須概念

マニフェストの実スキーマはRuntime実装時に確定するが、最低限次を持たせる。

| フィールド | 要件 |
| --- | --- |
| `schemaVersion` | アプリ側が認識する固定バージョン。未知のmajorは拒否 |
| `characterId` | `riai` または `noa`。ディレクトリとAction対象に一致 |
| `model3` | ディレクトリ内の相対パスのみ。URL、絶対パス、`..`を拒否 |
| `artRevision` / `rigRevision` | 参照アート版とリグ版を独立記録 |
| `status` | 実モデル完成時だけ実態に合う状態を設定。`MOCK`をCubism modelとして登録しない |
| `parameters` | ID、required/optional、推奨制作範囲、初期安全範囲、所有者 |
| `expressions` | API aliasからmodel3内の表情参照へのallowlist |
| `motions` | API alias、Cubism group/indexまたは参照、priority、interruptible、timeout |
| `layout` | 原点、推奨表示スケール、画面アンカー。モデル内部変形と分離 |
| `capabilities` | `gaze`, `mouth`, `ears`, `tail`, `crystal` 等、実装済み機能だけを列挙 |
| `files` | 必須ファイルの相対パス、サイズ、SHA-256等の整合性情報 |
| `provenance` | 制作元、参照、権利・配布確認状態。未確認を空欄でなく明示 |

ロード時は `.model3.json` 自体が参照する`.moc3`、テクスチャ、表情、モーション、物理の相対パスも検査する。マニフェストにない外部URLやディレクトリ外参照は拒否する。ファイル名の大文字小文字を本番環境と同様に検証する。

### 9.3 初期アセット予算

- MVP目標は各モデル1枚の2048×2048 RGBA atlasから開始する。品質またはパーツ数が不足すると実測で分かった場合のみ2枚目または高解像度を検討する。
- 2048×2048 RGBAは未圧縮で概ね16 MiBであり、2体同時表示、マスク、複製発光ArtMesh、ブラウザ側VFXを含むメモリを実機計測する。
- 加算発光用ArtMesh、クリッピングマスク、描画順分割を無制限に増やさない。見た目とdraw callの両方をプロファイルする。
- texture atlasの空き領域、texel density、透明パディングを記録し、元PSDの縮小や破壊的統合で帳尻を合わせない。

これらは合格済み予算ではない。RiaiとNoaを同時表示した実ランタイム計測が終わるまで、性能達成を主張しない。

## 10. Runtime Adapterの明示マッピング規則

### 10.1 起動時の境界確定

各モデルをロードした後、AdapterはRuntimeから全パラメータの `id / min / default / max` を列挙する。各許可パラメータについて次を計算する。

```text
effectiveMin = max(exportedMin, manifestSafeMin, policyHardMin)
effectiveMax = min(exportedMax, manifestSafeMax, policyHardMax)
effectiveDefault = clamp(exportedDefault, effectiveMin, effectiveMax)
```

- requiredパラメータが存在しない、値が有限数でない、`effectiveMin > effectiveMax`、既定値が解決不能の場合、そのキャラクターのCubism Adapter初期化をfail closedする。
- optionalパラメータが無い場合はcapabilityを無効にして監査ログへ記録する。代替の未知パラメータへ自動推測マッピングしない。
- マニフェストに無い実モデルパラメータは列挙・診断してもAction層から操作しない。
- 1つのAction payloadからCubism parameter ID、motion file path、expression file pathを受け取らない。
- 毎フレームの最終値もeffective rangeへclampするが、継続的clampはリグまたは合成の不具合として計測・警告する。

### 10.2 Actionからモデルへのマッピング

| 高レベルAction | 入力 | Adapterの決定論的処理 | 禁止事項 |
| --- | --- | --- | --- |
| `setExpression` | `character`, allowlisted `expression` | キャラクターマニフェストのaliasを解決し、固定fadeでexpression mixerへ渡す。未知aliasは拒否 | `.exp3.json` pathやparameter IDの直接指定 |
| `lookAt` | `character`, 正規化済み `x/y` (`-1..1`) | `ParamEyeBallX/Y`へ主成分、`ParamAngleX/Y`へ小さい追従成分、`ParamBodyAngleX`へさらに小さい追従成分をease付きで配分 | raw角度、範囲外値、1フレーム瞬間移動 |
| `lookAtCharacter` | `character`, allowlisted `target` | Scene Registryの検証済みアンカーを画面座標へ変換し、同じ`lookAt`経路へ渡す。自己参照・未ロードtargetは拒否 | モデルファイル内の座標や任意DOM selectorの指定 |
| `playMotion` | `character`, allowlisted `motion` | aliasからgroup/index、priority、interruptible、timeoutを解決。State Machineで予約・割込みを判定して開始 | motion path、SDK priority、loop回数の自由指定 |
| `emergencyStop` | system actionのみ | 両モデルのキューと予約を破棄、発話/明示動作を停止、表情を`neutral`へ、action所有パラメータを既定値へ短い固定easeで戻し、安全idleだけ再開 | 外部指定の復帰表情、任意motion、raw reset値 |

`lookAt` は符号付き正規化値を、既定値を中心にした実効範囲へ次のように写像する。正の入力は `default..effectiveMax`、負の入力は `effectiveMin..default` の範囲を使う。

```text
mapSigned(n, min, default, max) =
  n >= 0 ? default + n * (max - default)
         : default + n * (default - min)
```

初期配分案:

```text
ParamEyeBallX  = mapSigned(clamp(x, -1, 1), effective eye-X range)
ParamEyeBallY  = mapSigned(clamp(y, -1, 1), effective eye-Y range)
ParamAngleX    = mapSigned(clamp(x * 0.55, -1, 1), effective head-X range)
ParamAngleY    = mapSigned(clamp(y * 0.45, -1, 1), effective head-Y range)
ParamBodyAngleX = mapSigned(clamp(x * 0.15, -1, 1), effective body-X range)
```

これは正規化係数の提案であり、度数や実モデル値を直接意味しない。実リグを見ながらキャラクター別プロファイルで調整する。Noaの座位接地が崩れる場合はbody追従を0にできる。

### 10.3 値の合成順序

毎フレームの合成順を固定する。

1. exported defaultから開始する。
2. 現在の明示motionを評価する。
3. allowlisted expressionを規定blendで適用する。
4. gaze、blink、mouth、seeded idleなど担当controllerを所有パラメータへ適用する。
5. Cubism physicsを評価し、physics専用出力へ適用する。
6. effective rangeへ最終clampする。
7. 描画する。

同一パラメータに複数ownerが必要な場合、個別の加算量を先に内部状態で合成し、Cubismへは一度だけ書く。SDKの `set/add/multiply` 呼び出し順に偶然依存しない。時間は単調増加clockと上限付きdelta timeを使い、seeded behaviorのテストではclockとseedを注入する。

### 10.4 キャラクター別capability

- Riai: `gaze`, `blink`, `mouth`, `ears`, `hairPhysics`, `robePhysics` をMVP必須候補とする。`tail`, `crystal`, `arms`, `sleeves` は対応アートと手作業リグの完成後だけ有効化する。
- Noa: `gaze`, `blink`, `mouth`, `ears`, `tail`, `cloakPhysics`, `crystal` をMVP必須候補とする。眉や脚の独立動作は一次参照と手作業の再描画結果に応じて有効化する。
- capabilityがfalseのAction効果は暗黙に別動作へ置換しない。Action全体を拒否するか、仕様で定めた部分成功として監査ログへ明示する。

## 11. 書き出し前QC（Cubism Editor / Viewer）

実モデル制作者は各キャラクターを別々に検査し、その後2体同時Runtime検査を行う。

### 11.1 モデル単体

- [ ] 一次参照とのシルエット、色、顔、耳、衣装、結晶の照合が完了している。
- [ ] 推測で描かれた隠れ面がなく、必要な再描画は人間が承認している。
- [ ] neutral poseで全パラメータが既定値にあり、意図しない変形が無い。
- [ ] `ParamAngleX/Y/Z` の単独最小・中央・最大、および主要な組み合わせで破綻しない。
- [ ] `ParamBodyAngleX/Y/Z` と頭角度の主要組み合わせで首、肩、クローク、ローブが裂けない。
- [ ] 左右の目が個別に0まで閉じ、白目や虹彩が漏れず、1で一次参照の形へ戻る。
- [ ] 視線の全安全範囲で虹彩が眼球外へ出ず、ハイライトの追従が不自然でない。
- [ ] 口の開閉・口形の主要組み合わせで口腔や顔面が裂けない。閉口へ完全復帰する。
- [ ] 耳、尾、髪、ローブ、クローク、結晶の全制作範囲で反転、欠け、過伸長が無い。
- [ ] 描画順とクリッピングが、顔向き、閉眼、開口、髪揺れの極値でも正しい。
- [ ] 全表情がneutralから入りneutralへ戻り、未所有パラメータを変更しない。
- [ ] 全モーションが既定時間内に終了または仕様通りloopし、neutralへ滑らかに遷移する。
- [ ] 物理が停止状態でドリフトせず、大入力後に有限時間で減衰する。

### 11.2 書き出しbundle

- [ ] `.model3.json` が期待する`.moc3`、texture、expression、motion、physicsを相対パスで参照する。
- [ ] 参照ファイルが全て存在し、ファイル名の大文字小文字が一致する。
- [ ] 不要なPSD、`.cmo3`、バックアップ、参照画像、個人情報をruntime bundleへ混入していない。
- [ ] texture atlasに透明な端部パディングがあり、縮小時にも色にじみがない。
- [ ] Cubism Viewerで警告、欠損texture、欠損motion、破損physicsなしに読み込める。
- [ ] character manifestのSHA-256とファイルサイズが最終書き出しに一致する。
- [ ] ライセンス、権利、再配布対象ファイルの確認結果をprovenanceへ記録した。
- [ ] source bundleとruntime bundleを別成果物として保存し、revisionを対応付けた。

## 12. Runtime受入QC（SDK導入・実モデル完成後）

以下は `FUTURE WORK` であり、現在は実行不能。

- [ ] 2体の実モデルからパラメータ一覧、min/default/maxを取得し、マニフェストとの差分を保存する。
- [ ] required ID欠落、重複、非有限値、空のeffective rangeで初期化がfail closedする。
- [ ] optional ID欠落時に該当capabilityだけが無効になり、未知IDへフォールバックしない。
- [ ] 全expression / motion aliasが実ファイルへ一意に解決し、未知aliasを拒否する。
- [ ] Action payloadからraw parameter、ファイルpath、URL、JavaScript、shellを指定できない。
- [ ] `lookAt` の境界値と高速連打がrate limit、easing、effective rangeを超えない。
- [ ] motion priority、interruptible、timeout、cancelが2体それぞれ独立して決定論的に動く。
- [ ] `emergencyStop` が両キューを破棄し、neutral・安全idleへ規定時間内に復帰する。
- [ ] 同一seed、同一clock、同一Action列でidle、twitch、gaze driftが再現する。
- [ ] 30/60 fps、バックグラウンド復帰、長いframe gapで物理とcontrollerが発散しない。
- [ ] RiaiとNoaの同時表示で、目標デバイス上のframe time、GPU/CPU、texture memory、draw callを計測する。
- [ ] 片方のモデルを破損・欠落させても、renderer全体がcrashせず、安全なエラー表示と監査ログを残す。

## 13. 手作業Live2D工程への引き渡し条件

モデル制作へ進む前に、キャラクターごとに次を揃える。

1. 承認済みの非破壊レイヤーPSDと、一次参照との対応表。
2. `HUMAN REDRAW REQUIRED` 項目の完成・承認記録。
3. パーツの前後関係、ArtMesh、デフォーマ、パラメータ所有者の確定。
4. 本書の条件付きparameter/capabilityを採用するか除外するかの決定。
5. neutral、表情、モーションの静止画または動画による見た目の承認基準。
6. source/runtime bundleの命名、revision、バックアップ、権利確認方法。

この条件を満たしても、本書だけではLive2Dモデルは完成しない。PSD分離、隠れ面再描画、ArtMesh、デフォーマ、キーフォーム、物理、表情、モーション、書き出しは、Cubism Editor上の人間による制作と目視QAが必要である。
