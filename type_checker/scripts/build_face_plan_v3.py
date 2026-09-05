"""Build balanced face plans, documentation and a reproducible random preview draw.

Standard library only. Does not generate or overwrite portraits / runtime data.
"""
import hashlib
import json
import math
import random
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / 'data/plans/feature_schema_v3.json').read_text())
KEYS = [f['key'] for f in SCHEMA['features']]
LEVELS = [.15, .325, .5, .675, .85]
# face length, midface, lower face, jaw width/angle, chin width/roundness,
# cheekbone prominence, cheek fullness. Anatomically related coordinates move together.
OUTLINES = [
    ('round', '丸型', 'a distinctly round, short and broad face, full curved cheeks and a rounded chin', [.18,.35,.3,.68,.18,.6,.85,.3,.8]),
    ('short_oval', '短い卵型', 'a short oval face, curved jaw tapering gently to a small rounded chin', [.3,.3,.4,.4,.3,.38,.68,.4,.55]),
    ('oval', '卵型', 'an oval face of medium length, evenly curved cheeks and a gently tapered jaw', [.5,.5,.5,.48,.4,.45,.5,.48,.45]),
    ('long_oval', '面長卵型', 'a visibly long narrow oval face, longer midface and a slender rounded jaw', [.82,.7,.65,.3,.35,.35,.55,.48,.3]),
    ('soft_square', 'ベース型', 'a short broad square face, broad lower jaw with softly defined corners and a wide chin', [.3,.38,.4,.82,.68,.78,.45,.5,.55]),
    ('rectangle', '長方形', 'a long rectangular face, straight side contours and a broad angular jaw and wide chin', [.78,.6,.7,.75,.8,.72,.3,.55,.3]),
    ('heart', '逆三角型', 'a heart-shaped face, wider upper face tapering visibly to a slender jaw and small pointed chin', [.5,.48,.5,.22,.38,.2,.22,.55,.45]),
    ('diamond', '菱形', 'a diamond-shaped face, cheekbones visibly the widest point, narrower temples and a tapered defined jaw', [.62,.55,.58,.32,.65,.3,.35,.82,.3]),
]
OUTLINE_KEYS = KEYS[10:19]
EYES = ['round open eyes, short horizontally and visibly tall vertically', 'rounded almond eyes with a tall central opening', 'balanced almond eyes of moderate length', 'long almond eyes with a low vertical opening', 'distinctly elongated narrow eyes with a low vertical opening, naturally open rather than squinting']
EYE_JA = ['丸い', '丸アーモンド', 'アーモンド', '細アーモンド', '切れ長']
TILTS = ['clearly downturned outer corners, a natural gentle downward slant about 4 degrees', 'slightly downturned outer corners, about 2 degrees downward', 'level inner and outer eye corners', 'slightly upturned outer corners, about 2 degrees upward', 'clearly upturned outer corners, a natural upward slant about 4 degrees']
TILT_JA = ['垂れ', 'やや垂れ', '水平', 'ややつり', 'つり']
WIDTHS = ['a compact narrow mouth', 'a slightly narrow mouth', 'an ordinary medium-width mouth']
WIDTH_JA = ['短い', 'やや短い', '中間']
LIPS = ['naturally thin upper and lower lips', 'slender lips with restrained volume', 'ordinary medium-thin lips with restrained natural volume']
LIP_JA = ['薄い', 'やや薄い', '中間']
HAIR = {
    'male': [
        ('center_part', 'センターパート', 'straight black hair with a clearly visible center part, two curtain sections swept to the sides above the eyebrows, ears visible'),
        ('fringe_down', '自然な下ろし前髪', 'ordinary layered short black hair with a soft, loosely separated fringe falling naturally down over the eyebrows; wispy tips reach just below the eyebrows but stay out of the eyes; light natural volume and irregular strands, no bowl-cut outline and no blunt straight fringe'),
        ('up_bang', 'アップバング', 'short black hair with the entire front fringe lifted up and back, fully exposed forehead, short sides, no skin fade'),
    ],
    'female': [
        ('center_part', 'センターパート', 'straight black shoulder-length hair with a center part, forehead exposed and side strands tucked behind the ears'),
        ('fringe_down', '自然な下ろし前髪', 'straight black shoulder-length hair with a soft, loosely separated fringe falling naturally over the eyebrows; wispy tips reach just below the eyebrows but stay out of the eyes; side hair tucked behind the ears, no rounded bowl silhouette and no blunt straight fringe'),
        ('up_bang', '額出し', 'black shoulder-length hair with the front section lifted and swept back, full forehead visible, side hair tucked behind the ears'),
    ],
}


def balanced(n, rng):
    values = [i % n for i in range(40)]
    rng.shuffle(values)
    return values


def pair_cost(a, b):
    counts = Counter(zip(a, b))
    ac, bc = Counter(a), Counter(b)
    return sum((counts[x, y] - nx * ny / 40) ** 2 / (nx * ny / 40)
               for x, nx in ac.items() for y, ny in bc.items())


def columns(seed):
    rng = random.Random(seed)
    cols = {'outline': balanced(8, rng)}
    # Independently permute balanced columns, choosing the least confounded candidate.
    for name, size in [('eye_shape',5),('eye_angle',5),('mouth_width',5),('lip_fullness',5),
                       ('nose_width',3),('nose_bridge_height',3),('nose_tip_roundness',3),
                       ('eyebrow_arch',3),('eyebrow_thickness',3),('eyebrow_angle',3),
                       ('hair',3),('upper_eyelid_crease',3),('upper_lip_share',3),
                       ('cupid_bow_definition',3),('eye_size',3),('eye_spacing',3),
                       ('eyebrow_eye_distance',3),('lower_eyelid_fullness',3)]:
        candidates = [balanced(size, rng) for _ in range(400)]
        cols[name] = min(candidates, key=lambda a: sum(pair_cost(a,b) for b in cols.values()))
    return cols


def impressions(shape):
    def t(kind, v):
        return v if kind == 'p' else 1-v if kind == 'n' else 1-2*abs(v-.5)
    return {k: sum(w*t(kind,shape[key]) for kind,key,w in terms)
            for k,terms in SCHEMA['mapping'].items()}


def tags(shape):
    v = impressions(shape)
    raw = dict(cool=v['cool'], cute=v['cute'], tsurime=max(0,2*shape['eye_angle']-1),
               tareme=max(0,1-2*shape['eye_angle']), adult=v['mature'],
               idol=.6*v['cute']+.4*v['glamorous'], mysterious=v['mysterious'],
               shortFace=1-shape['midface_ratio'], soft=v['soft'], sharp=v['sharp'])
    return {k: math.floor(x*100+.5+1e-9)/100 for k,x in raw.items()}


def make_plan(gender, seed):
    cols = columns(seed)
    records = []
    for i in range(40):
        c = {k:v[i] for k,v in cols.items()}
        # Keep the original identities / allocation; cap only the rejected mouth extremes.
        for key in ['mouth_width', 'lip_fullness']:
            c[key] = min(c[key], 2)
        outline = OUTLINES[c['outline']]
        shape = dict(zip(OUTLINE_KEYS, outline[3]))
        for key in KEYS:
            if key not in shape:
                shape[key] = LEVELS[c[key]] if key in ['eye_shape','eye_angle','mouth_width','lip_fullness'] else [.2,.5,.8][c[key]]
        hair = HAIR[gender][c['hair']]
        def phrase(key):
            f = next(f for f in SCHEMA['features'] if f['key'] == key)
            return f['phrases'][c[key]]
        subject = 'man' if gender == 'male' else 'woman'
        prompt = (
            f'Use case: photorealistic-natural. Create one distinct fictional adult Japanese {subject}, age 27. '
            f'Facial identity, highest priority: {outline[2]}. Eyes: {EYES[c["eye_shape"]]}; {TILTS[c["eye_angle"]]}; '
            f'{phrase("upper_eyelid_crease")}. Mouth: {WIDTHS[c["mouth_width"]]}; {LIPS[c["lip_fullness"]]}; '
            f'{phrase("upper_lip_share")}; {phrase("cupid_bow_definition")}. '
            'Keep the mouth compact to average in width and the lips thin to moderate; no large mouth, no thick or plumped lips, no overlining. '
            f'Nose: {phrase("nose_width")}, {phrase("nose_bridge_height")}, {phrase("nose_tip_roundness")}; an ordinary natural nose, with its specified width and tip clearly visible. '
            f'Brows: {phrase("eyebrow_arch")}, {phrase("eyebrow_thickness")}, {phrase("eyebrow_angle")}; naturally groomed, no extreme arches or shaved brows. '
            f'Hair: {hair[2]}. Additional proportions: {phrase("eye_size")}, {phrase("eye_spacing")}, '
            f'{phrase("eyebrow_eye_distance")}, {phrase("lower_eyelid_fullness")}. '
            'The person is attractive and well-groomed THROUGH these specific individual features; preserve the described face outline, lip thickness and eye geometry rather than replacing them with a generic model face. All anatomy stays within a normal adult range. '
            'Realistic editorial beauty photograph with natural skin texture, dark brown eyes, minimal natural makeup, no contour makeup, no facial hair, no jewelry or glasses. '
            'Front-facing, head level, eyes at camera, relaxed neutral expression, closed lips without smile. Plain light-gray crew-neck top. Neutral light-gray studio background and even soft frontal lighting. '
            'Portrait 3:4 canvas. Moderately pulled-back camera, crop at middle of chest, show full head and shoulders and natural background around the head. Face from hairline to chin occupies about 38 percent of image height, face center at 50 percent width and 38 percent height. '
            'Keep eyes and full cheek and jaw contours visible. For a downward fringe, allow natural partial eyebrow coverage and do not shorten the fringe to expose the eyebrows. No baby bangs or above-eyebrow fringe. No tight face crop, no waist or legs, no caricature, no text, no watermark.'
        )
        ident = f'{gender}_{i+1:03d}'
        label = '・'.join([outline[1],EYE_JA[c['eye_shape']],TILT_JA[c['eye_angle']],f"唇{WIDTH_JA[c['mouth_width']]}／{LIP_JA[c['lip_fullness']]}",hair[1]])
        records.append(dict(id=ident,gender=gender,image=None,planned_image=f'assets/previews/v3/{gender}/{ident}.png',label=label,tags=tags(shape),prompt=prompt,
                            shape_features=shape,appearance_features=dict(face_outline=outline[0],hair_style=hair[0]),
                            design_levels=c,schema_version='3.1.0',mapping_version='shape-impression-1',
                            asset_version='v3-planned',review_status='planned',shape_feature_source='generation_target'))
    return dict(schema_version='3.1.0',gender=gender,design_seed=seed,records=records,
                coverage={k:dict(sorted(Counter(r['design_levels'][k] for r in records).items())) for k in cols})


def write_docs(plan):
    gender = plan['gender']
    jp = '男性' if gender == 'male' else '女性'
    lines = [f'# 画像生成用特徴量：{jp}40人 ver3', '',
             '全員が整った容姿の架空の成人日本人（27歳）。各部位を独立に配分した生成目標で、画像からの実測値ではない。', '',
             '[改訂設計書](設計書_ver3.md) / [機械可読の全40件](../data/plans/'+gender+'_faces_v3.json)', '',
             '未生成の計画では `image=null`。`planned_image` は将来の保存先。現行診断データには読み込まない。', '',
             '| ID | 輪郭 | 目の形 | 目尻 | 唇の横幅 | 唇の厚さ | 鼻幅 / 鼻筋 / 鼻先 | 眉形 / 太さ / 傾斜 | 髪型 |',
             '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
    for r in plan['records']:
        c = r['design_levels']
        nose = ' / '.join([['細め','中間','やや広め'][c['nose_width']],['穏やか','中間','通った'][c['nose_bridge_height']],['すっきり','中間','丸い'][c['nose_tip_roundness']]])
        brow = ' / '.join([['直線','緩い曲線','アーチ'][c['eyebrow_arch']],['細め','中間','太め'][c['eyebrow_thickness']],['平行','少し上昇','上昇'][c['eyebrow_angle']]])
        lines.append(f"| {r['id']} | {OUTLINES[c['outline']][1]} | {EYE_JA[c['eye_shape']]} | {TILT_JA[c['eye_angle']]} | {WIDTH_JA[c['mouth_width']]} | {LIP_JA[c['lip_fullness']]} | {nose} | {brow} | {HAIR[gender][c['hair']][1]} |")
    lines += ['', '## 各人の全26形態値・髪型・生成プロンプト', '', '以下の数値は0〜1の設計座標。対応定義と目標範囲は改訂設計書に記載。']
    for r in plan['records']:
        lines += ['', f"### {r['id']} — {r['label']}", '', '```json', json.dumps(dict(shape_features=r['shape_features'],appearance_features=r['appearance_features'],tags=r['tags']),ensure_ascii=False,indent=2), '```', '', '```text', r['prompt'], '```']
    (ROOT/f'docs/画像生成用特徴量_{jp}40人_ver3.md').write_text('\n'.join(lines)+'\n')


def main():
    for gender, seed in [('male',3060901),('female',3060902)]:
        plan = make_plan(gender, seed)
        (ROOT/f'data/plans/{gender}_faces_v3.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
        write_docs(plan)
    # A uniform sample without replacement, drawn after freezing both plans.
    # The draw is persisted once; rebuilding plans must not silently redraw it.
    path = ROOT/'data/previews/male_v3_selection.json'
    if not path.exists():
        seed = random.SystemRandom().getrandbits(64)
        ids = random.Random(seed).sample([f'male_{i:03d}' for i in range(1,41)],10)
        plan_path = ROOT/'data/plans/male_faces_v3.json'
        path.write_text(json.dumps(dict(gender='male',population=40,sample_size=10,seed=seed,
                        method='Python random.Random(seed).sample(population_in_id_order, 10)',
                        ids_in_draw_order=ids,plan_sha256=hashlib.sha256(plan_path.read_bytes()).hexdigest()),indent=2)+'\n')
    draw = json.loads(path.read_text())
    draw['current_plan_sha256'] = hashlib.sha256((ROOT/'data/plans/male_faces_v3.json').read_bytes()).hexdigest()
    draw['current_plan_version'] = '3.1.0'
    draw['revision_note'] = '抽出IDは維持。唇の厚さ・横幅を中間以下へ制限し、下ろし前髪を眉にかかる自然な長さへ修正。plan_sha256は初回抽出時の計画。'
    path.write_text(json.dumps(draw, ensure_ascii=False, indent=2)+'\n')
    print(path.read_text())


if __name__ == '__main__':
    main()
