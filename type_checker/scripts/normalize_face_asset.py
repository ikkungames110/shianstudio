import argparse
from pathlib import Path

import cv2
import numpy as np


OUTPUT_WIDTH = 1200
OUTPUT_HEIGHT = 1600
TARGET_FACE_HEIGHT = 620
TARGET_FACE_CENTER_X = OUTPUT_WIDTH // 2
TARGET_FACE_CENTER_Y = 610


def latest_generated_image() -> Path:
    root = Path.home() / ".codex" / "generated_images"
    files = [path for path in root.rglob("*") if path.is_file()]
    if not files:
        raise FileNotFoundError(f"No generated images found under {root}")
    return max(files, key=lambda path: path.stat().st_mtime)


def detect_face(image: np.ndarray) -> tuple[int, int, int, int] | None:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(str(cascade_path))
    faces = cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(120, 120))
    if len(faces) == 0:
        return None
    return max(faces, key=lambda rect: rect[2] * rect[3])


def crop_with_padding(image: np.ndarray, x: float, y: float, w: float, h: float) -> np.ndarray:
    height, width = image.shape[:2]
    x0 = int(np.floor(x))
    y0 = int(np.floor(y))
    x1 = int(np.ceil(x + w))
    y1 = int(np.ceil(y + h))

    pad_left = max(0, -x0)
    pad_top = max(0, -y0)
    pad_right = max(0, x1 - width)
    pad_bottom = max(0, y1 - height)

    if any((pad_left, pad_top, pad_right, pad_bottom)):
        image = cv2.copyMakeBorder(
            image,
            pad_top,
            pad_bottom,
            pad_left,
            pad_right,
            borderType=cv2.BORDER_REPLICATE,
        )
        x0 += pad_left
        y0 += pad_top
        x1 += pad_left
        y1 += pad_top

    return image[y0:y1, x0:x1]


def normalize(image: np.ndarray) -> tuple[np.ndarray, bool]:
    face = detect_face(image)
    if face is None:
        height, width = image.shape[:2]
        target_ratio = OUTPUT_WIDTH / OUTPUT_HEIGHT
        current_ratio = width / height
        if current_ratio > target_ratio:
            crop_h = height
            crop_w = int(round(height * target_ratio))
            crop_x = (width - crop_w) // 2
            crop_y = 0
        else:
            crop_w = width
            crop_h = int(round(width / target_ratio))
            crop_x = 0
            crop_y = max(0, (height - crop_h) // 2)
        crop = image[crop_y : crop_y + crop_h, crop_x : crop_x + crop_w]
        return cv2.resize(crop, (OUTPUT_WIDTH, OUTPUT_HEIGHT), interpolation=cv2.INTER_CUBIC), False

    x, y, w, h = face
    scale = TARGET_FACE_HEIGHT / h
    crop_w = OUTPUT_WIDTH / scale
    crop_h = OUTPUT_HEIGHT / scale
    face_center_x = x + w / 2
    face_center_y = y + h / 2
    crop_x = face_center_x - TARGET_FACE_CENTER_X / scale
    crop_y = face_center_y - TARGET_FACE_CENTER_Y / scale

    crop = crop_with_padding(image, crop_x, crop_y, crop_w, crop_h)
    return cv2.resize(crop, (OUTPUT_WIDTH, OUTPUT_HEIGHT), interpolation=cv2.INTER_CUBIC), True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=None)
    parser.add_argument("--dest", type=Path, required=True)
    args = parser.parse_args()

    source = args.input or latest_generated_image()
    image = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Could not read image: {source}")

    normalized, detected = normalize(image)
    args.dest.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(args.dest), normalized)
    print(f"{source} -> {args.dest} face_detected={detected}")


if __name__ == "__main__":
    main()
