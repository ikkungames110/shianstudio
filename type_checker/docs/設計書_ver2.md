# 顔タイプ診断アプリ 設計書 ver2

- 設計版: `2.0.0`（2026-09-05）
- 対象要件: [要件定義_ver2.md](要件定義_ver2.md)。特に #3〜#8 の仕様を本書で確定する。
- 成果物: 本書、[女性40人の特徴量リスト](画像生成用特徴量_女性40人_ver2.md)、[男性40人の特徴量リスト](画像生成用特徴量_男性40人_ver2.md)。
- 今回の範囲は設計と生成計画の作成。以下のファイル配置・API は次回実装時の仕様であり、アプリの実装済み機能を意味しない。

## 1. 採用する構成と既存実装

### 1.1 決定事項

| 項目 | 決定 |
| --- | --- |
| Level 1 | 男女共通の形態24項目。各値は `0.00〜1.00` |
| Level 2 | 男女共通の印象10項目。それぞれ独立した `0.00〜1.00` |
| Level 3 | 8タイプ。10次元の代表ベクトルとの平均二乗距離で分類 |
| 人数・問題数 | 男女各40人、1回20有効選択。スキップは選択数に含めない |
| 好みの集計 | 選択画像の形態平均と変換用の補助統計を保持。選択・非選択の双方を記録 |
| 画像の品質 | 全員が整った容姿の架空の成人日本人。魅力度の高低を比較軸にしない |
| 設定の版 | `schema_version=2.0.0`、`mapping_version=shape-impression-1`、`type_version=types-1`、`aggregation_version=selected-mean-1` |

### 1.2 既存コードを活かす変更対象

`index.html` が画面、出題、タグ加算、結果判定を含む静的アプリで、`data/female_faces.js` と `data/male_faces.js` に各40件の画像メタデータがある。`assets/` には対応する計80枚がある。現在の画像を新しい形態値の実測済み画像とは扱わない。

| 現在の処理 | ver2での扱い |
| --- | --- |
| `TAGS` と `choose()` のタグ加算 | 互換用タグを残し、回答ログと形態集計へ置換 |
| `resultName()` のタグ順位・条件分岐 | 外部定義の代表ベクトルとの距離で判定 |
| `sortedScores()`、最大値基準の結果バー | 印象スコア `round(100 × score)` の絶対目盛りに変更 |
| `bestResultFace()` のタグ内積 | ユーザー印象と各画像印象の距離で選択 |
| `buildRounds()` の乱数ソート | Fisher–Yates による40枚のシャッフルと隣接ペア化 |
| `renderCard()` の画像だけの表示 | 維持。特徴ラベル、タグ、矢印、タイプ名をカードに出さない |
| SVGによる6件のフォールバック | ver2診断には使用せず、40件の適合データが揃わない場合は開始を止める |
| 開始・診断・結果画面、再診断、コピー | 既存の画面遷移と操作を継続利用 |

旧 `tags` だけから24項目を逆算することはできない。移行は、既存画像の全項目レビュー、または本リストによる再生成を通して行う。

## 2. 共通の画像品質と比較条件

全80件の前提は「自然で整った容姿、調和のある顔立ち、同水準の撮影品質」。どの形態軸でも低値を容姿の低評価、高値を容姿の高評価とは解釈しない。細い鼻だけ、二重まぶただけ、特定の輪郭だけを採用条件にしない。

- 全員27歳の架空の成人日本人。`youthful` は成人内のフレッシュな印象であり、未成年の生成指定ではない。
- 正面、水平な頭部、カメラ目線、肩から上、自然な閉口・無表情。笑顔の有無で愛嬌を作らない。
- 無地の薄い灰色背景・服、均等な柔らかい正面光、同じ顔占有率、写実的なエディトリアル美容写真。
- 黒髪・自然な暗褐色の虹彩。女性は髪を後ろにまとめ、男性は額から離した短髪。男女それぞれで髪型条件を統一し、眉・目・輪郭を隠さない。
- 髭、眼鏡、装飾品、カラーコンタクト、濃いメイク、輪郭補正、文字、透かしを入れない。肌の色、肌荒れ、年齢、表情、撮影品質を診断用の変数にしない。
- 自然な肌の質感と個性は保ち、過剰な加工や誇張した解剖表現は避ける。

整い方は生成素材の品質条件であり、人物の価値を評価するスコアではない。特徴値が小さいことを理由に不採用にせず、形状破綻、不自然な左右差、指定外の誇張、描画不良を修正する。

## 3. Level 1: Shape Features（要件 #3）

### 3.1 確定する24項目

`0.50` は各軸の基準的な中間。次表の `0.00` / `1.00` は本アプリで採用する自然な成人形態の範囲の両端であり、人体で可能な極限ではない。比率の説明はレビュー時の観察対象であり、値自体は実測比率ではない。

| No. | キー | 特徴 | 0.00側 | 1.00側 | 観察・分離の基準 |
| --- | --- | --- | --- | --- | --- |
| 01 | `eye_angle` | 目尻の傾斜 | 穏やかな垂れ目 | 穏やかなつり目 | 目頭と目尻を結ぶ線の傾斜。正面・頭部水平で判定。 |
| 02 | `eye_shape` | 目の縦横比 | 丸みのある目 | 切れ長の目 | 目の開口部の横幅 / 縦幅。眼球の大きさとは分ける。 |
| 03 | `eye_size` | 目の相対面積 | 控えめな目の面積 | 存在感のある目の面積 | 左右平均の眼裂面積 / 顔領域面積。縦横比とは別に調整。 |
| 04 | `eye_spacing` | 目の間隔 | やや寄り目 | やや離れ目 | 内眼角間距離 / 左右平均の眼裂横幅。 |
| 05 | `upper_eyelid_crease` | 上まぶたの折り目 | 目立たない折り目 | 明瞭な折り目 | 正面で見える折り目の明瞭さ。幅・一重二重の優劣は表さない。 |
| 06 | `lower_eyelid_fullness` | 下まぶたの膨らみ | なだらかな下まぶた | ふっくらした下まぶた | 睫毛直下の局所的な膨らみ。目の下の影やクマは含めない。 |
| 07 | `eyebrow_angle` | 眉の傾斜 | 水平に近い眉 | 眉尻に向け上がる眉 | 眉頭から眉尻までの全体的な傾斜。眉山の曲率と分ける。 |
| 08 | `eyebrow_arch` | 眉山の曲率 | 直線的な眉 | なだらかなアーチ眉 | 眉の中央部が眉頭・眉尻を結ぶ線から離れる度合い。 |
| 09 | `eyebrow_thickness` | 眉の太さ | 繊細な眉 | しっかりした眉 | 眉中央の見かけの太さ / 眼裂縦幅。色の濃さは固定。 |
| 10 | `eyebrow_eye_distance` | 眉と目の距離 | 近い | 離れている | 瞳孔上での上まぶたと眉下縁の距離 / 眼裂縦幅。 |
| 11 | `face_length_width` | 顔の縦横比 | 短めの輪郭 | 長めの輪郭 | 生え際中央〜顎先の高さ / 頬骨部の横幅。丸さ自体は別項目。 |
| 12 | `midface_ratio` | 中顔面の比率 | 短めの中顔面 | 長めの中顔面 | 瞳孔を結ぶ水平線〜鼻下の距離 / 生え際〜顎先の高さ。 |
| 13 | `lower_face_ratio` | 下顔面の比率 | 短めの下顔面 | 長めの下顔面 | 鼻下〜顎先の距離 / 生え際〜顎先の高さ。中顔面との和に注意。 |
| 14 | `jaw_width` | 下顎の横幅 | 細めの下顎 | 幅のある下顎 | 左右下顎角間距離 / 頬骨部横幅。角張りとは独立。 |
| 15 | `jaw_angularity` | 下顎角の角張り | 曲線的な下顎角 | 輪郭の明瞭な下顎角 | 耳下から顎先への方向変化の明瞭さ。 |
| 16 | `chin_width` | 顎先の横幅 | 細めの顎先 | 幅のある顎先 | 顎先直上の横幅 / 下顎横幅。前後方向の突出は扱わない。 |
| 17 | `chin_roundness` | 顎先の丸み | 先端がすっきりした顎 | 丸みのある顎 | 顎先最下部の局所的な曲率。横幅と分ける。 |
| 18 | `cheekbone_prominence` | 頬骨の輪郭 | 控えめな頬骨 | 明瞭な頬骨 | 正面での頬骨の輪郭・起伏の見え方。照明で誇張しない。 |
| 19 | `cheek_fullness` | 頬の膨らみ | すっきりした頬 | ふっくらした頬 | 頬骨下〜口横の軟部の膨らみ。体格は推定しない。 |
| 20 | `nose_bridge_height` | 鼻筋の立体感 | 穏やかな鼻筋 | 通った鼻筋 | 正面・同一照明での見かけの立体感。実測の鼻高ではない。 |
| 21 | `nose_width` | 鼻の横幅 | 細めの鼻 | 幅のある鼻 | 小鼻外側間距離 / 内眼角間距離。 |
| 22 | `nose_tip_roundness` | 鼻先の丸み | すっきりした鼻先 | 丸みのある鼻先 | 鼻尖の正面輪郭の丸み。鼻筋の高さとは独立。 |
| 23 | `mouth_width` | 口の横幅 | 小ぶりな口 | 幅のある口 | 口角間距離 / 瞳孔間距離。閉口・無表情で判定。 |
| 24 | `lip_fullness` | 唇の厚み | 薄めの唇 | ふっくらした唇 | 上下の赤唇部の合計高さ / 口角間距離。口紅で補わない。 |

### 3.2 統合・不採用とする項目

要件例の `facial_feature_position` は曖昧な「幼い／大人っぽい配置」として持たず、`eye_spacing`、`midface_ratio`、`lower_face_ratio` に分解する。`face_shape` は縦横比・下顎幅・下顎角・顎先・頬に分解する。`nose_size` は正面から比較できる鼻幅と鼻先形状へ分解する。

顔の前後方向の突出、横顔の鼻の高さ、耳の形など、正面画像だけでは安定して評価しにくい項目は採用しない。`nose_bridge_height` と `cheekbone_prominence` は正面での見かけに限定する。髪色、髪型、化粧、笑顔、肌の明るさ、美醜は24項目に含めない。

### 3.3 形態の整合性

各軸は意味を分けるが、幾何学的に完全に独立という意味ではない。たとえば中顔面・下顔面の長さは同じ全顔高を分母とするため、同時に極端な長さにできない。生成後は比率の合計が実際の顔に収まり、額を含む他の部位が不自然に圧縮されていないことを確認する。目の面積を変える際は指定した縦横比も保つ。輪郭の角張りは頬を痩せさせる指示に置き換えない。

## 4. 値・正規化・生成指示（要件 #4）

### 4.1 値の契約

- 保存範囲は全24項目とも `0.00〜1.00`、有限の数値、小数第2位まで。欠損、`null`、文字列、範囲外は検証エラー。未指定を `0` や `0.5` で補完しない。
- 生成計画の80件は自然さと比較可能性を両立するため `0.15〜0.85` に限定し、`0.05` 刻みを採用する。低値側も高値側も整った容姿として生成する。
- 形態値はPoCの設計上の相対座標。`eye_angle=0.75` は75度ではなく、`midface_ratio=0.30` は全顔高の30%という実測値ではない。0.05の差を客観的な測定精度と主張しない。
- 男女で同じ定義・方向・基準を使用する。男女別の順位や分位点へ変換しない。生成人物の性別はメタデータであり、印象変換の係数を変更しない。
- 将来実測を導入する際は、承認した共通アンカーの実測値 `a0, a1` を設定に保存し、`x=clip((r-a0)/(a1-a0),0,1)` とする。現時点で人体の統計値や度数を仮定しない。実測化はスキーマ版を更新する。

### 4.2 正方向・逆方向・中間適合

```text
P(x) = x
N(x) = 1 - x
B(x) = 1 - 2 × abs(x - 0.50)
```

形態の物理的な対立は一つの軸で表現する。たとえば目尻は `eye_angle` だけを正本とし、独立した垂れ目量・つり目量を入力しない。`B` は中程度の形態への適合度で、別の形態項目ではない。

### 4.3 プロンプトへの翻訳

生成に使うプロンプトは、共通の品質指定に続けて24項目の英語表現を**定義順にすべて**連結する。今回の各レコードには完成済みの `prompt` を収録した。英語表現の対応表は次のとおり。

| キー | 0.00 ≤ x < 0.40 | 0.40 ≤ x ≤ 0.60 | 0.60 < x ≤ 1.00 |
| --- | --- | --- | --- |
| `eye_angle` | gently downturned outer eye corners | level outer eye corners | gently upturned outer eye corners |
| `eye_shape` | rounded eye openings | almond-shaped eye openings | elongated eye openings |
| `eye_size` | subtly sized eyes | medium-sized eyes | prominent large eyes |
| `eye_spacing` | slightly close-set eyes | balanced eye spacing | slightly wide-set eyes |
| `upper_eyelid_crease` | subtle upper-eyelid creases | moderately visible upper-eyelid creases | clearly visible upper-eyelid creases |
| `lower_eyelid_fullness` | smooth lower-eyelid contours | moderate lower-eyelid fullness | gently full lower eyelids |
| `eyebrow_angle` | nearly horizontal eyebrows | slightly rising eyebrows | distinctly rising eyebrows |
| `eyebrow_arch` | straight eyebrow contours | gently curved eyebrow contours | arched eyebrow contours |
| `eyebrow_thickness` | fine eyebrows | medium-width eyebrows | full eyebrows |
| `eyebrow_eye_distance` | low eyebrow-to-eye spacing | balanced eyebrow-to-eye spacing | open eyebrow-to-eye spacing |
| `face_length_width` | a relatively short face outline | an oval face outline | a relatively long face outline |
| `midface_ratio` | a compact midface | balanced midface proportions | an elongated midface |
| `lower_face_ratio` | a compact lower face | balanced lower-face proportions | an elongated lower face |
| `jaw_width` | a narrow jaw | a medium-width jaw | a broad balanced jaw |
| `jaw_angularity` | smooth curved jaw angles | moderately defined jaw angles | crisp defined jaw angles |
| `chin_width` | a slender chin | a medium-width chin | a broader chin |
| `chin_roundness` | a softly tapered chin tip | a gently contoured chin tip | a rounded chin tip |
| `cheekbone_prominence` | subtle cheekbone contours | moderately defined cheekbones | clearly defined cheekbones |
| `cheek_fullness` | sleek cheek contours | moderately full cheeks | gently full cheeks |
| `nose_bridge_height` | a softly defined nasal bridge | a moderately defined nasal bridge | a well-defined nasal bridge |
| `nose_width` | a slender nose width | a balanced nose width | a slightly broader nose width |
| `nose_tip_roundness` | a refined tapered nose tip | a softly contoured nose tip | a gently rounded nose tip |
| `mouth_width` | a petite mouth width | a balanced mouth width | a generous mouth width |
| `lip_fullness` | delicate lips | moderately full lips | full lips |

数値をそのまま角度・寸法として英語化しない。3区分内の微差はプロンプトだけでは保証できないため、数値ベクトルは生成目標、生成画像のレビュー値は観察値として区別する。レビューで差を確認できなければ同じ観察値に修正する。全80件は互いに異なるプロンプト・数値ベクトルを持つが、生成画像の人物識別性も別途確認する。

画像生成器に `generation_group`、最終タイプ名、`tags` を追加指定しない。抽象的なタイプ名で形態指定を上書きさせない。

## 5. Level 2: Impression Features（要件 #5・#6）

10項目を採用する。すべて独立した `0.00〜1.00` のスコアで、合計を1に正規化しない。`cute + cool = 1`、`mature + youthful = 1`、`soft + sharp = 1` といった制約も設けない。

| キー | 表示名 | 本設計で扱う印象 |
| --- | --- | --- |
| `cute` | かわいさ | 丸い目、短めの中顔面、頬などの組合せによる甘い印象 |
| `cool` | クールさ | 切れ長の目、眉の傾斜、明瞭な輪郭などの組合せ |
| `mature` | 大人っぽさ | 縦方向の比率、鼻筋、頬骨による落ち着いた印象 |
| `youthful` | フレッシュさ | 成人の範囲で、目の存在感と短めの下顔面による若々しい印象 |
| `soft` | やわらかさ | 下顎・頬・顎先などの曲線による印象 |
| `sharp` | シャープさ | 頬骨や下顎の明瞭さ、局所的な細さによる印象 |
| `glamorous` | 華やかさ | 目・唇の存在感、鼻筋などによる印象。メイク量ではない |
| `approachable` | 親しみやすさ | 穏やかな目元と口元・頬の形態から受ける親しみの印象 |
| `mysterious` | ミステリアスさ | 切れ長の目、まぶた・眉目間などの組合せによる印象 |
| `androgynous` | 中性的な印象 | 複数部位の中程度の形態と眉の組合せによるスタイル上の印象 |

これらは娯楽用の印象モデルであり、形態から性格、実年齢、性自認を推定するものではない。とくに中性的な印象は初期の表現上の仮説であり、性別判定をして平均に近い人を抽出する処理ではない。

## 6. Shape → Impression 変換（要件 #7）

### 6.1 初期変換式を確定

`x` は一人分の24次元ベクトル。各式の係数和は1で、全項が `[0,1]` のため結果も `[0,1]` になる。未記載の項の重みは0。バイアス、追加の標準化、性別補正は入れない。内部計算は丸めず、表示時だけ丸める。丸めは非負数に対する四捨五入（half-up）で統一し、互換タグは小数第2位、タイプ代表値は小数第3位、表示スコアは整数とする。

```text
cute = 0.25 × P(eye_size) + 0.20 × N(eye_shape) + 0.20 × N(midface_ratio) + 0.20 × P(cheek_fullness) + 0.15 × P(lower_eyelid_fullness)
cool = 0.25 × P(eye_shape) + 0.20 × P(eye_angle) + 0.20 × P(jaw_angularity) + 0.15 × P(eyebrow_angle) + 0.20 × P(nose_bridge_height)
mature = 0.25 × P(face_length_width) + 0.20 × P(midface_ratio) + 0.20 × P(lower_face_ratio) + 0.20 × P(nose_bridge_height) + 0.15 × P(cheekbone_prominence)
youthful = 0.25 × N(lower_face_ratio) + 0.25 × P(eye_size) + 0.20 × N(face_length_width) + 0.15 × P(lower_eyelid_fullness) + 0.15 × P(chin_roundness)
soft = 0.25 × N(jaw_angularity) + 0.25 × P(cheek_fullness) + 0.20 × P(chin_roundness) + 0.15 × P(eyebrow_arch) + 0.15 × P(nose_tip_roundness)
sharp = 0.25 × P(jaw_angularity) + 0.25 × P(cheekbone_prominence) + 0.15 × N(chin_width) + 0.15 × N(nose_width) + 0.10 × N(lip_fullness) + 0.10 × N(jaw_width)
glamorous = 0.25 × P(eye_size) + 0.25 × P(lip_fullness) + 0.15 × P(upper_eyelid_crease) + 0.15 × P(nose_bridge_height) + 0.10 × P(mouth_width) + 0.10 × P(cheekbone_prominence)
approachable = 0.20 × N(eye_angle) + 0.15 × N(eyebrow_angle) + 0.20 × P(cheek_fullness) + 0.20 × P(mouth_width) + 0.10 × P(eye_spacing) + 0.15 × P(nose_tip_roundness)
mysterious = 0.25 × P(eye_shape) + 0.20 × N(upper_eyelid_crease) + 0.20 × N(eyebrow_eye_distance) + 0.15 × P(cheekbone_prominence) + 0.10 × N(mouth_width) + 0.10 × N(lower_eyelid_fullness)
androgynous = 0.20 × B(jaw_width) + 0.15 × B(chin_width) + 0.15 × B(nose_width) + 0.15 × B(lip_fullness) + 0.15 × B(face_length_width) + 0.10 × P(eyebrow_thickness) + 0.10 × N(eyebrow_arch)
```

重みはPoCで採用する初期仮説であり、実証済みの知覚法則ではない。現時点でユーザーの選択ログによる学習や画像の印象評価は行っていない。各形態項目は少なくとも一つの式に登場する。

### 6.2 設定と変換器を分離

`config/shape_to_impression.js` に以下の形式で全10式を定義し、`js/impression.js` はキー・変換名・係数を読む汎用評価器とする。係数をUIや画像ごとの手書きタグへ分散させない。

```javascript
window.SHAPE_TO_IMPRESSION = {
  version: "shape-impression-1",
  outputs: {
    cute: [
      { feature: "eye_size", transform: "positive", weight: 0.25 },
      { feature: "eye_shape", transform: "negative", weight: 0.20 },
      { feature: "midface_ratio", transform: "negative", weight: 0.20 },
      { feature: "cheek_fullness", transform: "positive", weight: 0.20 },
      { feature: "lower_eyelid_fullness", transform: "positive", weight: 0.15 }
    ]
  }
};
```

このコードは1出力の形式例。実装時は6.1節の全10式を設定する。設定読込時に24個の形態キーと10個の出力キー、非負の有限係数、係数和1（許容誤差 `1e-9`）を検証する。

### 6.3 旧タグとの互換

`data/<gender>_faces.js` の `id`、`gender`、`image`、`label`、`tags`、`prompt` は残し、24項目の `shape_features` と版情報を追加する。既存の男女共通10キーは変更しない。ver2の計算は `shape_features` を正本にする。

| 旧キー | 新データからの生成式 |
| --- | --- |
| `cool` | `impression.cool` |
| `cute` | `impression.cute` |
| `tsurime` | `max(0, 2 × eye_angle - 1)` |
| `tareme` | `max(0, 1 - 2 × eye_angle)` |
| `adult` | `impression.mature` |
| `idol` | `0.60 × impression.cute + 0.40 × impression.glamorous` |
| `mysterious` | `impression.mysterious` |
| `shortFace` | `1 - midface_ratio` |
| `soft` | `impression.soft` |
| `sharp` | `impression.sharp` |

互換タグだけ小数第2位へ丸める。`tsurime` / `tareme` は単一軸からの派生値なので同時に正にならない。`idol` は互換用途に限定し、11個目の印象項目にしない。既存画像のタグは今回変更しない。次回、画像と観察値を確定したときに同時更新する。

## 7. Level 3: Type Labels（要件 #8）

### 7.1 8タイプの名称と代表ベクトル

タイプIDは男女共通とし、表示名だけ対象に合わせる。生成用の8群×5人は素材の初期配分であり、診断ロジックがその群を参照して答えを返すことはない。

| ID | 共通名 | 女性向け表示 | 男性向け表示 |
| --- | --- | --- | --- |
| `classic_cute` | 王道かわいい系 | 王道かわいい系 | 王道かわいい系 |
| `clean_soft` | 清楚系 | 清楚系 | 爽やか系 |
| `mature_elegant` | 大人きれい系 | 綺麗なお姉さん系 | 大人の端正系 |
| `cool_beauty` | クール美形系 | クール美人系 | クール美形系 |
| `mysterious` | ミステリアス系 | ミステリアス系 | ミステリアス系 |
| `friendly` | 愛嬌系 | 愛嬌系 | 愛嬌系 |
| `androgynous` | 中性的タイプ | 中性的タイプ | 中性的タイプ |
| `glamorous` | 華やかタイプ | 華やかタイプ | 華やかタイプ |

代表ベクトルの各値は初期の基準形態を6.1節で変換し、小数第3位まで固定した設定値。10項目の順序は以下の列順とする。

| ID | cute | cool | mature | youthful | soft | sharp | glamorous | approachable | mysterious | androgynous |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `classic_cute` | 0.773 | 0.298 | 0.288 | 0.750 | 0.690 | 0.428 | 0.583 | 0.605 | 0.320 | 0.645 |
| `clean_soft` | 0.483 | 0.398 | 0.428 | 0.503 | 0.555 | 0.463 | 0.400 | 0.493 | 0.473 | 0.700 |
| `mature_elegant` | 0.385 | 0.573 | 0.728 | 0.338 | 0.435 | 0.548 | 0.550 | 0.453 | 0.523 | 0.760 |
| `cool_beauty` | 0.328 | 0.790 | 0.665 | 0.365 | 0.238 | 0.740 | 0.498 | 0.278 | 0.653 | 0.630 |
| `mysterious` | 0.298 | 0.568 | 0.650 | 0.318 | 0.375 | 0.608 | 0.395 | 0.425 | 0.780 | 0.740 |
| `friendly` | 0.670 | 0.275 | 0.335 | 0.645 | 0.735 | 0.343 | 0.505 | 0.778 | 0.373 | 0.725 |
| `androgynous` | 0.438 | 0.493 | 0.493 | 0.470 | 0.445 | 0.463 | 0.473 | 0.493 | 0.583 | 0.955 |
| `glamorous` | 0.603 | 0.560 | 0.623 | 0.553 | 0.500 | 0.553 | 0.780 | 0.500 | 0.408 | 0.725 |

代表ベクトルも重みと同様に初期仮説。上表を `config/types.js` に保持し、別のタイプ数や名称へ変更しても変換器を変更しない。上表の値を実装の正本とし、生成群の平均に合わせて実行時に再計算しない。

### 7.2 判定方法・同点・混合傾向

```text
distance_squared(type) = Σ_j (user_impression[j] - centroid[type][j])² / 10
```

10項目を等しい重みで比較する。最小距離のタイプを主結果、次点を副候補として保存する。同点（距離差 `≤ 1e-12`）では7.1節の定義順を使用する。表示順の偶然で判定を変えない。

結果に主タイプを必ず1つ表示し、`sqrt(d2) - sqrt(d1) < 0.03` なら「○○系の傾向もあります」と副候補を添える。全タイプから遠い場合（最小RMS距離 `> 0.20`）は「複数のタイプにまたがる傾向です」を添える。閾値は `types-1` 設定に集約する。距離差を確率や診断の正答率に変換しない。

### 7.3 計算例

ユーザー印象が `cool_beauty` の代表ベクトルと同じなら、そのタイプとの距離は0で、女性では「クール美人系」、男性では「クール美形系」と表示する。今回の80件の計画形態を一人ずつ変換・分類すると、男女とも全8タイプへ各5件が最も近くなることを確認した。これは設計値の到達性検証であり、生成画像や実ユーザーの診断精度の検証ではない。

## 8. 選択 → 好みの推定（要件 #9・#10）

### 8.1 出題と回答記録

開始時に対象性別の承認済み40件を検証し、Fisher–Yates でシャッフルして20ペアを作る。各画像は初回20ペアで一度だけ表示される。左右も乱数で決め、乱数seedと提示順を保持する。同じ画像同士の比較を禁止する。

スキップ時もそのペアと `selected_id=null` を記録し、集計対象から除外する。20有効選択に不足する場合は、40件を再シャッフルして追加ペアを作り、直前と同じ組合せは再抽選する。ユーザーがスキップを続けても選択を捏造しない。途中で開始画面へ戻れる。重複イベントは `pair_id` 単位で一度だけ受理する。

### 8.2 PoCの集計式

有効選択集合を `C`、その件数を `n`、各画像の形態値を `x` とする。

```text
mean[j]         = Σ_C x_selected[j] / n
balanced_mean[j]= Σ_C B(x_selected[j]) / n
variance[j]     = Σ_C (x_selected[j] - mean[j])² / n
baseline[j]     = Σ_C (x_selected[j] + x_rejected[j]) / (2n)
delta[j]        = Σ_C (x_selected[j] - x_rejected[j]) / n
```

`UserShapePreference` は上記統計と `n` を持つ。印象計算では、6.1節の `P(j)` を `mean[j]`、`N(j)` を `1-mean[j]`、`B(j)` を `balanced_mean[j]` と読み替える。これにより結果は「選択された各画像の印象ベクトルの平均」と等しくなる。

中間適合の `B` は非線形なので `B(mean[j])` を使わない。たとえば0.20と0.80を一度ずつ選んだ場合、平均形態は0.50でも中間の形態を好んだ根拠はない。`B(mean)=1.00` に対して正しい平均適合は `(0.40+0.40)/2=0.40` になる。形態平均だけへ情報を潰さず、補助統計を保持する理由はこの誤判定を防ぐためである。

`delta` は詳細傾向と将来モデルのために保存するが、PoCの主タイプ推定では平均に加算しない。非選択との差分は好みの方向、選択形態の平均は好みの形態座標であり、同じ数値として扱わない。`n=0` は結果なし、`1〜19` は途中状態、`n=20` で診断完了とする。

### 8.3 詳細傾向の抽出

有効ペアのうち `abs(x_selected[j]-x_rejected[j]) ≥ 0.10` の件数を `support[j]` とする。`support[j] ≥ 5` かつ `abs(delta[j]) ≥ 0.10` の軸を候補にし、`abs(delta)` の降順、同点は特徴定義順で最大3件を表示する。

正方向なら3.1節の高値側、負方向なら低値側の文言で「〜を好む傾向」とする。「小ぶりな口より幅のある口」のような比較方向を表現し、画像の形態平均が極端だったと断定しない。候補がなければ「今回は特定の形態への強い偏りは見られませんでした」と表示する。相関する形態を個別原因とは断定しない。

### 8.4 交換可能な集計器

`aggregate(choices, face_lookup, config) -> UserShapePreference` を境界にする。将来Bradley–Terry系へ変更するときも、生の比較ログと対応する画像版から再推定できる。将来モデルの係数は嗜好方向であり、`[0,1]` の形態座標ではないため、そのまま6.1節へ渡さず専用アダプターと集計版を追加する。

## 9. データ契約とモジュール

### 9.1 分離する概念

| 概念 | 必須内容・責務 |
| --- | --- |
| `ShapeFeatureDefinition` | キー、名称、両端・中間定義、観察基準、生成文言、値域、定義版 |
| `ImpressionFeatureDefinition` | 10個のキー、表示名、説明、定義版 |
| `ShapeToImpressionMapping` | 変換名、入力キー、係数、版 |
| `TypeDefinition` | ID、男女別表示名、10次元代表値、判定閾値、版 |
| `FaceImage` | 既存6フィールド、24個の `shape_features`、生成目標、承認状態、画像版、スキーマ版、変換版 |
| `UserChoice` | セッションID、ペアID、左右ID、選択IDまたはnull、提示時刻・回答時刻、左右それぞれの画像版 |
| `UserShapePreference` | `mean`、`balanced_mean`、`variance`、`baseline`、`delta`、`support`、有効件数、集計版 |
| `UserImpressionPreference` | 印象10スコア、スキーマ版、変換版、集計版 |
| `DiagnosisResult` | 主・副タイプIDと距離、10スコア、詳細形態、代表画像ID、回答件数、全設定版 |

すべての辞書キーは定義と完全一致させる。形態は `snake_case` を正本とし、既存互換タグの `shortFace` は変更しない。性別は診断対象セットの指定であり、ユーザー本人の性別は収集しない。

### 9.2 生成計画と公開用レコード

別紙のJSON各件は `review_status="planned"`、`asset_version="v2-planned"` とする。この状態の `shape_features` は生成目標。`image` は移行後の配置予定先で、同名の既存PNGが新仕様を満たすことを示さない。既存の `data/` に今回の計画値だけを上書きしない。

公開時は元の計画値を `generation_shape_features` として保持し、`shape_features` は生成画像のレビューで確定した24値にする。`review_status="approved"`、`asset_version="v2-001"` などの実画像版を付与する。`tags` は承認後の値から再計算する。`prompt` は実際に使った最終プロンプトに更新し、修正して再生成した場合の履歴は管理用記録に残す。

`generation_group` と `label` は制作管理用であり、学習の正解ラベルにも診断の直接入力にも使わない。画像と形態が不一致なら画像を作り直すか、観察値を修正してタグを再計算する。異なる画像版のログを同一画像として混ぜない。

### 9.3 ファイル配置と読み込み順

```text
config/shape_features.js          ShapeFeatureDefinition
config/impression_features.js     ImpressionFeatureDefinition
config/shape_to_impression.js     ShapeToImpressionMapping
config/types.js                   TypeDefinition
config/diagnosis.js               問数・集計版・詳細傾向閾値
js/validation.js                 データ・設定検証
js/preference.js                 回答集計
js/impression.js                 形態統計 → 印象
js/classifier.js                 印象 → タイプ
js/quiz.js                       出題・回答・状態管理
js/result.js                     結果データ構築・表示
index.html                       既存画面・イベント接続
scripts/normalize_face_asset.py  既存の正規化処理
data/female_faces.js             window.FEMALE_FACE_ASSETS
data/male_faces.js               window.MALE_FACE_ASSETS
assets/female/female_001.png     女性001〜040
assets/male/male_001.png         男性001〜040
```

静的配信を継続し、ビルド基盤を必須にしない。設定→データ→検証器と計算モジュール→画面初期化の順に通常の `script defer` で読む。計算関数はDOMに依存させず、`window.FaceDiagnosis` 名前空間へまとめる。データのグローバル名は既存を維持する。

### 9.4 保存と再現性

PoCは回答をセッション内メモリに保存し、再診断時にリセットする。外部送信や永続的な行動収集は追加しない。セッション開始時に画像データ・設定の版と乱数seedを固定し、途中で差し替えない。分析用エクスポートを将来追加する場合は、選択ログと各版の対応表を保持し、記録方針を別途定める。

## 10. 画面・異常時の動作

- 診断カードは肖像画像だけを表示する。`label`、`tags`、生成群、矢印、特徴解説を画像・カード・ツールチップへ出さない。操作用のアクセシブル名は「左の顔を選ぶ」「右の顔を選ぶ」とし、特徴量を読み上げ名に含めない。
- 主結果にタイプ名、副候補は7.2節の条件で表示する。印象は10項目のバーを `0〜100` の固定目盛りで表示する。「好みの印象の傾向」であり、美しさの点数とは表示しない。
- 詳細傾向は8.3節に基づき最大3件。結果の代表画像は、承認済み40件のうちユーザー印象に最も近い画像を等重みの平均二乗距離で選ぶ。同点は画像ID順。代表画像を合成した顔だとは説明しない。
- 画像読込完了まで左右の選択を無効化する。画像エラーやデータ不足時は再読込・開始画面に戻る操作を表示し、欠損画像や未承認データで診断を進めない。
- 開始前に40件・全キー・版整合性を検証する。非有限値などの計算エラー時は不正な結果を表示しない。
- キーボード・スワイプ・クリックは共通の回答関数へ渡し、画面状態とペアIDで二重受付を防ぐ。結果コピーの文言も新タイプ名と印象名に統一する。

## 11. 80人の生成・レビュー・公開手順

1. 別紙の男女各40件を生成計画の正本として確定する。IDは `female_001〜040` / `male_001〜040`。各件に24値・互換タグ・完成プロンプトが揃っている。
2. 制作時は公開先とは別の作業ディレクトリに、同じ `data/`・`assets/` 構造の制作セットを用意する。全40件の計画を先に `window.FEMALE_FACE_ASSETS` / `window.MALE_FACE_ASSETS` 形式で保存してから生成を始める。片方の性別だけを更新する場合も、その性別の40件を揃えてから公開へ進める。
3. 各レコードの `prompt` で1枚につき1人を生成し、入力ファイルを明示して正規化する。例（制作ディレクトリをカレントディレクトリにして実行）:

   ```bash
   python3 /path/to/type_checker/scripts/normalize_face_asset.py --input /path/to/generated/female_001.png --dest assets/female/female_001.png
   ```

4. `1200×1600`、顔中心と大きさの統一を確認する。既存スクリプトの目標は検出顔高620px、検出顔中心 `(600,610)`。`face_detected=False` は中央クロップへのフォールバックなので、顔位置の合格とは扱わず目視で再調整する。
5. 共通品質条件、人物の区別、24形態の方向、輪郭・目・口の破綻をレビューする。全体の整い方を揃え、どの生成群にも画質やメイクの有利不利を作らない。
6. 初期には男女共通のレビュー用アンカー画像を各軸の低・中・高で選び、同じアンカーに対して観察値を付ける。生成目標と画像が明確に違う場合は再生成、または観察値を修正する。全画像を同一アンカーで確認する。複数のレビュアーで確認した際に各軸の評点差が0.15を超えた場合は、観察基準と画像を再確認して確定する。今回の計画値がレビュー済みであるとは扱わない。
7. 承認形態から印象・互換タグを再計算し、全タイプへの素材分布を再確認する。各性別で8タイプに各3件以上を公開の目安とし、不足時は該当する形態の画像を入れ替えて40件を維持する。生成群に合うよう観察値を偽って修正しない。
8. 制作完了時に各 `image` の存在、1200×1600、各性別40件、IDの一意性、余剰画像なし、24形態・10タグの値域、タグ再計算一致、全件承認、版整合性を確認する。
9. 制作セットから `data/<gender>_faces.js` と対応する `assets/<gender>/` を同じ変更単位で公開セットへ移す。既存と同じIDの再生成でも画像版は更新する。未生成の計画を公開データとして配信しない。
10. リポジトリ指示に従って変更をコミットし、設定済みremoteへプッシュする。

## 12. 検証と段階的な実装

### 12.1 本成果物で確認すること

- 男女各40件、各24形態、80件のID・形態ベクトル・プロンプトの一意性。
- 全形態が計画範囲 `0.15〜0.85` に入り、性別ごとに各軸に少なくとも0.30幅の変化があること。
- 全互換タグが指定の10キーだけを持ち、定義式による再計算と一致すること。
- 全プロンプトに成人日本人、整った容姿、正面、背景、写真様式、`no text, no watermark` と24項目の文言が含まれること。
- 10変換式の係数和が1、全24形態が使用されること。8代表ベクトルにより、男女とも8タイプへ到達すること。

### 12.2 次回実装時の確認

計算関数では、欠損値の拒否、係数・キー検証、変換の値域、両立可能な印象が相補値に固定されないこと、中間適合の非線形集計例、同点の安定判定、0件・スキップ・20件の扱いを確認する。出題では初回40枚の重複なし、同一画像対戦なし、左右の記録と選択ログの一致を確認する。

画面ではカードに採点ヒントがないこと、画像ロード失敗で回答できないこと、操作の二重受付がないこと、結果バーが固定尺度であること、再診断・コピー・モバイル操作を確認する。生成後は画像とデータの双方向対応も確認する。

### 12.3 実装順と検証上の限界

設定・純粋計算モジュール → 承認済み形態と画像の整備 → 回答ログと集計 → 新分類と結果表示 → 画面・データ検証の順に移行する。途中段階の旧タグから新形態への便宜的な逆算は行わない。

40人で24次元すべての組合せを網羅することはできない。初期の8群は特徴が相関した素材構成なので、選択理由を独立した因果効果としては説明できない。20選択の結果も代表的な傾向として扱う。今後は同じ部位以外を揃えた比較素材の追加・入替と、独立した人手の印象評定により変換重みを検証する。

選択ログだけでは「何をかわいいと呼ぶか」という印象の正解は得られない。形態→印象の改善には別途印象評定を使用し、選択ログは嗜好モデルの改善に使用する。クラスタリングによるタイプ数・代表値の見直しは `type_version` を更新し、旧設定・旧画像版を保持して比較可能にする。
