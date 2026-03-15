import os
import subprocess
import tempfile
import numpy as np
import cv2
from cog import BasePredictor, Input, Path as CogPath
from PIL import Image


class Predictor(BasePredictor):

    def setup(self):
        """Warm up — charge EasyOCR sur GPU."""
        import easyocr
        self.reader = easyocr.Reader(['fr', 'en'], gpu=True)

    def predict(
        self,
        video: CogPath = Input(description="Vidéo d'entrée (upload ou URL)"),
        conf_threshold: float = Input(
            description="Seuil de confiance OCR (0.1 = tout détecter, 0.9 = très sélectif)",
            default=0.2,
            ge=0.05,
            le=0.95,
        ),
        mask_dilation: int = Input(
            description="Dilatation du masque en pixels",
            default=20,
            ge=5,
            le=60,
        ),
        sample_frames: int = Input(
            description="Nombre de frames analysées pour construire le masque global",
            default=10,
            ge=1,
            le=30,
        ),
        inpaint_radius: int = Input(
            description="Rayon d'inpainting OpenCV (plus grand = zone de reconstruction étendue)",
            default=5,
            ge=1,
            le=20,
        ),
    ) -> CogPath:
        video_path = str(video)
        video_stem = os.path.splitext(os.path.basename(video_path))[0]
        tmp_video = os.path.join(tempfile.gettempdir(), f"{video_stem}_tmp.mp4")
        output_path = os.path.join(tempfile.gettempdir(), f"{video_stem}_no_sub.mp4")

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # ── Phase 1 : masque global sur N frames échantillonnées ──
        print(f"[1/2] Détection EasyOCR sur {sample_frames} frames...")
        global_mask = np.zeros((height, width), dtype=np.uint8)
        kernel = np.ones((mask_dilation, mask_dilation), np.uint8)

        sample_indices = [int(i * total / sample_frames) for i in range(sample_frames)]
        for idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            results = self.reader.detect(
                frame,
                min_size=10,
                text_threshold=conf_threshold,
                low_text=0.3,
                link_threshold=0.1,
            )
            boxes = results[0] if results and results[0] else []
            for box in boxes:
                arr = np.array(box, dtype=np.float32)
                # EasyOCR detect() renvoie soit [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
                # soit [x_min, x_max, y_min, y_max] selon la version
                if arr.ndim == 1 and arr.shape[0] == 4:
                    # format [x_min, x_max, y_min, y_max]
                    x_min, x_max, y_min, y_max = arr.astype(int)
                    pts = np.array([[x_min, y_min], [x_max, y_min],
                                    [x_max, y_max], [x_min, y_max]], dtype=np.int32)
                else:
                    pts = arr.reshape((-1, 2)).astype(np.int32)
                if len(pts) >= 3:
                    cv2.fillPoly(global_mask, [pts.reshape((-1, 1, 2))], 255)

        global_mask = cv2.dilate(global_mask, kernel)
        has_text = global_mask.max() > 0
        print(f"[1/2] Texte détecté : {'oui (' + str(int(global_mask.sum()/255)) + ' px)' if has_text else 'non'}")

        # ── Phase 2 : inpainting frame par frame ──
        print(f"[2/2] Inpainting sur {total} frames...")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(tmp_video, fourcc, fps, (width, height))

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if has_text:
                frame = cv2.inpaint(frame, global_mask, inpaint_radius, cv2.INPAINT_TELEA)
            writer.write(frame)
            frame_idx += 1
            if frame_idx % 100 == 0:
                print(f"  {frame_idx}/{total} frames")

        cap.release()
        writer.release()

        # ── Réintègre l'audio ──
        subprocess.run([
            "ffmpeg", "-y",
            "-i", tmp_video, "-i", video_path,
            "-c:v", "libx264", "-crf", "18",
            "-c:a", "aac",
            "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", output_path,
        ], capture_output=True)

        if os.path.exists(tmp_video):
            os.remove(tmp_video)

        if not os.path.exists(output_path):
            raise RuntimeError("Fichier de sortie introuvable.")

        return CogPath(output_path)
