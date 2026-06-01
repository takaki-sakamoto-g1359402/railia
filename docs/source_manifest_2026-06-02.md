# Railia MVP source manifest

この文書は、2026-06-02時点のRailia MVPローカル記録の監査用マニフェストです。

- Local record repository: `/Users/sakamototakaki/Documents/New project/railia-mvp-record`
- Local branch: `codex/railia-mvp-record`
- Local commit: `561b5ec9030e819c49d81d45a1ec654f61a8b02c`
- Full local archive: `/Users/sakamototakaki/Documents/New project/railia-mvp-record.zip`
- Full local archive SHA-256: `6364172ca8e83857c94d68f39d326ee9adefe78031dc5e905e5414511c78fe3a`
- X投稿URL: `https://x.com/re_a_takaki/status/2061504576013095418`

## 主要ファイル

- `README.md`
- `.gitignore`
- `docs/railia_status_backlog_2026-06-02.md`
- `frontend/app/**`
- `frontend/components/railia/**`
- `frontend/components/ui/**`
- `frontend/lib/railia/types.ts`
- `frontend/lib/railia/seed.ts`
- `frontend/lib/railia/state.tsx`
- `frontend/lib/railia/view.ts`
- `frontend/package.json`
- `frontend/package-lock.json`
- `output/railia_x_card.png`

## 完成度スコア

- クリック可能MVP: 72/100
- 要件充足: 82/100
- 状態・報酬フロー: 76/100
- UI/UX: 68/100
- QA/実行安定性: 40/100
- 本番準備: 28/100
- iOS配布準備: 18/100

## 実装済みの改善

- ブランド名をRailiaに統一。
- Next.js App Router、TypeScript、Tailwind、shadcn/ui相当の構成でクリック可能MVPを作成。
- ロール選択、ワーカー、クライアント、管理者の主要導線を実装。
- タスク開始、AI下書き編集、チェックリスト、提出、レビュー、承認、報酬反映のローカル状態フローを実装。
- localStorageのバージョン付き永続化と状態正規化を追加。
- タスク状態・ロール・レビュー権限のガードを追加。
- 却下理由と1回の再提出導線を追加。
- 監査ログ、フラグ、品質スコア、報酬履歴のモック構造を追加。
- X投稿用カード画像を生成。

## 残る主要改善点

- dev/buildの安定化。現環境ではSWC/native dependency側の問題があり、`tsc --noEmit`のみ通過。
- E2Eテスト追加。タスク提出、承認、ウォレット反映、再提出をPlaywrightで固定する。
- ソース一式のGitHub通常push。現在のターミナルにはGitHub CLIとHTTPS認証がなく、コネクタ経由で記録を作成。
- Supabase/OpenAI/決済/KYC/税務を追加できる抽象境界の明文化。
- iOS配布前にPWA/React Native/SwiftUIの方針決定、審査用表現、本人確認・税務・支払い要件の整理。
