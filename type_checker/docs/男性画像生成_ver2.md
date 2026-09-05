# 男性画像 ver2 生成記録

- 対象: `male_001〜male_040` の40人。男性の旧画像・旧メタデータを全件置換。女性セットは今回の更新対象外。
- 方式: 内蔵 `image_gen`。各レコードの個別プロンプトから1人につき1枚を生成。
- 特徴量の計画: [男性40人の特徴量リスト](画像生成用特徴量_男性40人_ver2.md)。全員が整った容姿の架空の成人日本人であることを共通条件とした。
- 保存先: `assets/male/male_001.png` 〜 `assets/male/male_040.png`。
- 実際に使った最終プロンプトと対応メタデータ: [data/male_faces.js](../data/male_faces.js)。

## 構図と正規化

目・眉・鼻・口・輪郭の24項目の生成目標は計画値を保持した。正規化時の端の引き伸ばしを防ぐため、プロンプトの構図を胸上までの少し引いた撮影に調整した。初期の寄りすぎた画像は採用していない。

全40枚を既存の `scripts/normalize_face_asset.py --input <元画像> --dest assets/male/<id>.png` で正規化した。最終画像は1200×1600、検出顔の目標高さ620px、目標中心 `(600,610)`。全件で顔検出に成功し、画像外の余白補完を必要としない入力を使用した。

## 特徴量の扱い

`shape_features` と `generation_shape_features` は生成に指定した24項目の目標値を保持する。`shape_feature_source="generation_target"` として、画像から実測・校正された値とは区別する。互換用の10タグは設計書の変換式から算出した値である。

全画像の容姿・正面構図・服装・背景・描画破綻・文字の有無を目視確認し、`review_status="visual_checked"` とした。これは設計書で想定するアンカーを使った24項目の定量評定完了を意味しない。数値の0.05刻みまで画像が再現しているとは主張しない。定量評定を導入する際は画像に基づく観察値で `shape_features` と互換タグを同時更新する。

## 確認結果

- 男性40レコードと40枚が1対1で対応し、欠損・余剰画像・重複IDなし。
- 全件PNG、1200×1600。ファイル内容のSHA-256も全40枚で異なる。
- 全件に24形態・男女共通10タグ・個別の最終生成プロンプトが存在し、値域とタグの再計算一致を確認。
- 既存の `window.MALE_FACE_ASSETS` と画像パスを維持し、診断カードに特徴量やラベルを追加していない。
- 診断ロジック自体のver2移行は今回行っていない。現在のアプリは従来どおり互換タグを使用する。

## 画像一覧

以下は制作記録用の一覧であり、診断中の選択カードには表示しない。

| ID | 画像 | 制作用の特徴群 |
| --- | --- | --- |
| `male_001` | [画像](../assets/male/male_001.png) | 王道かわいい系・生成案1 |
| `male_002` | [画像](../assets/male/male_002.png) | 王道かわいい系・生成案2 |
| `male_003` | [画像](../assets/male/male_003.png) | 王道かわいい系・生成案3 |
| `male_004` | [画像](../assets/male/male_004.png) | 王道かわいい系・生成案4 |
| `male_005` | [画像](../assets/male/male_005.png) | 王道かわいい系・生成案5 |
| `male_006` | [画像](../assets/male/male_006.png) | 清楚系・生成案1 |
| `male_007` | [画像](../assets/male/male_007.png) | 清楚系・生成案2 |
| `male_008` | [画像](../assets/male/male_008.png) | 清楚系・生成案3 |
| `male_009` | [画像](../assets/male/male_009.png) | 清楚系・生成案4 |
| `male_010` | [画像](../assets/male/male_010.png) | 清楚系・生成案5 |
| `male_011` | [画像](../assets/male/male_011.png) | 大人きれい系・生成案1 |
| `male_012` | [画像](../assets/male/male_012.png) | 大人きれい系・生成案2 |
| `male_013` | [画像](../assets/male/male_013.png) | 大人きれい系・生成案3 |
| `male_014` | [画像](../assets/male/male_014.png) | 大人きれい系・生成案4 |
| `male_015` | [画像](../assets/male/male_015.png) | 大人きれい系・生成案5 |
| `male_016` | [画像](../assets/male/male_016.png) | クール美形系・生成案1 |
| `male_017` | [画像](../assets/male/male_017.png) | クール美形系・生成案2 |
| `male_018` | [画像](../assets/male/male_018.png) | クール美形系・生成案3 |
| `male_019` | [画像](../assets/male/male_019.png) | クール美形系・生成案4 |
| `male_020` | [画像](../assets/male/male_020.png) | クール美形系・生成案5 |
| `male_021` | [画像](../assets/male/male_021.png) | ミステリアス系・生成案1 |
| `male_022` | [画像](../assets/male/male_022.png) | ミステリアス系・生成案2 |
| `male_023` | [画像](../assets/male/male_023.png) | ミステリアス系・生成案3 |
| `male_024` | [画像](../assets/male/male_024.png) | ミステリアス系・生成案4 |
| `male_025` | [画像](../assets/male/male_025.png) | ミステリアス系・生成案5 |
| `male_026` | [画像](../assets/male/male_026.png) | 愛嬌系・生成案1 |
| `male_027` | [画像](../assets/male/male_027.png) | 愛嬌系・生成案2 |
| `male_028` | [画像](../assets/male/male_028.png) | 愛嬌系・生成案3 |
| `male_029` | [画像](../assets/male/male_029.png) | 愛嬌系・生成案4 |
| `male_030` | [画像](../assets/male/male_030.png) | 愛嬌系・生成案5 |
| `male_031` | [画像](../assets/male/male_031.png) | 中性的タイプ・生成案1 |
| `male_032` | [画像](../assets/male/male_032.png) | 中性的タイプ・生成案2 |
| `male_033` | [画像](../assets/male/male_033.png) | 中性的タイプ・生成案3 |
| `male_034` | [画像](../assets/male/male_034.png) | 中性的タイプ・生成案4 |
| `male_035` | [画像](../assets/male/male_035.png) | 中性的タイプ・生成案5 |
| `male_036` | [画像](../assets/male/male_036.png) | 華やかタイプ・生成案1 |
| `male_037` | [画像](../assets/male/male_037.png) | 華やかタイプ・生成案2 |
| `male_038` | [画像](../assets/male/male_038.png) | 華やかタイプ・生成案3 |
| `male_039` | [画像](../assets/male/male_039.png) | 華やかタイプ・生成案4 |
| `male_040` | [画像](../assets/male/male_040.png) | 華やかタイプ・生成案5 |
