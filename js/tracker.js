(() => {
  'use strict';

  const VISION_ESM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';
  const VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
  const HAND_MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const FACE_MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  let visionModPromise = null;
  let visionFileset = null;
  let handLandmarker = null;
  let faceLandmarker = null;
  let handPromise = null;
  let facePromise = null;
  let handDelegate = 'GPU';
  let faceDelegate = 'GPU';
  let consecutiveHandErr = 0;
  let consecutiveFaceErr = 0;
  let emptyHandFrames = 0;
  let emptyFaceFrames = 0;

  async function acquireWidestFrontStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('此環境不支援相機 API，請使用 HTTPS 網址並以 Safari 或 Chrome 開啟');
    }

    const attempts = [
      {
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      },
      {
        audio: false,
        video: { facingMode: 'user' }
      }
    ];

    let stream = null;
    let lastErr = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!stream) throw lastErr || new Error('無法取得前鏡頭畫面');

    return stream;
  }

  async function getVisionModule() {
    if (!visionModPromise) {
      visionModPromise = import(VISION_ESM_URL);
    }
    const mod = await visionModPromise;
    if (!visionFileset) {
      visionFileset = await mod.FilesetResolver.forVisionTasks(VISION_WASM_URL);
    }
    return mod;
  }

  async function createHandWithDelegate(delegate) {
    const mod = await getVisionModule();
    handDelegate = delegate;
    return mod.HandLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
        delegate
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.25,
      minHandPresenceConfidence: 0.25,
      minTrackingConfidence: 0.25
    });
  }

  async function createFaceWithDelegate(delegate) {
    const mod = await getVisionModule();
    faceDelegate = delegate;
    return mod.FaceLandmarker.createFromOptions(visionFileset, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_URL,
        delegate
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.25,
      minFacePresenceConfidence: 0.25,
      minTrackingConfidence: 0.25
    });
  }

  async function ensureDetector(mode) {
    if (mode === 'hand') {
      if (handLandmarker) return handLandmarker;
      if (!handPromise) {
        handPromise = (async () => {
          try {
            try {
              handLandmarker = await createHandWithDelegate('GPU');
            } catch {
              handLandmarker = await createHandWithDelegate('CPU');
            }
            return handLandmarker;
          } catch (err) {
            handPromise = null;
            throw err;
          }
        })();
      }
      return handPromise;
    }

    if (mode === 'head') {
      if (faceLandmarker) return faceLandmarker;
      if (!facePromise) {
        facePromise = (async () => {
          try {
            try {
              faceLandmarker = await createFaceWithDelegate('GPU');
            } catch {
              faceLandmarker = await createFaceWithDelegate('CPU');
            }
            return faceLandmarker;
          } catch (err) {
            facePromise = null;
            throw err;
          }
        })();
      }
      return facePromise;
    }

    return null;
  }

  function switchHandToCpu() {
    emptyHandFrames = 0;
    consecutiveHandErr = 0;
    try { handLandmarker?.close?.(); } catch {}
    handLandmarker = null;
    handPromise = createHandWithDelegate('CPU')
      .then(inst => {
        handLandmarker = inst;
        return inst;
      })
      .catch(() => null);
    return handPromise;
  }

  function switchFaceToCpu() {
    emptyFaceFrames = 0;
    consecutiveFaceErr = 0;
    try { faceLandmarker?.close?.(); } catch {}
    faceLandmarker = null;
    facePromise = createFaceWithDelegate('CPU')
      .then(inst => {
        faceLandmarker = inst;
        return inst;
      })
      .catch(() => null);
    return facePromise;
  }

  async function detectLandmarks(mode, videoEl, ts) {
    if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
      return null;
    }
    if (mode === 'hand') {
      if (!handLandmarker) return null;
      try {
        const res = handLandmarker.detectForVideo(videoEl, ts);
        consecutiveHandErr = 0;
        const lm = res?.landmarks?.[0] || null;
        if (lm) {
          emptyHandFrames = 0;
          return lm;
        }
        emptyHandFrames++;
        // 若部分手機（如 S25）GPU delegate 靜默回傳空結果達 ~1.6 秒，自動切換 CPU delegate 自癒
        if (emptyHandFrames >= 25 && handDelegate === 'GPU') {
          await switchHandToCpu();
        }
        return null;
      } catch (err) {
        consecutiveHandErr++;
        if (consecutiveHandErr >= 3 && handDelegate === 'GPU') {
          await switchHandToCpu();
          return null;
        }
        throw err;
      }
    }

    if (mode === 'head') {
      if (!faceLandmarker) return null;
      try {
        const res = faceLandmarker.detectForVideo(videoEl, ts);
        consecutiveFaceErr = 0;
        const lm = res?.faceLandmarks?.[0] || null;
        if (lm) {
          emptyFaceFrames = 0;
          return lm;
        }
        emptyFaceFrames++;
        if (emptyFaceFrames >= 25 && faceDelegate === 'GPU') {
          await switchFaceToCpu();
        }
        return null;
      } catch (err) {
        consecutiveFaceErr++;
        if (consecutiveFaceErr >= 3 && faceDelegate === 'GPU') {
          await switchFaceToCpu();
          return null;
        }
        throw err;
      }
    }

    return null;
  }

  window.StarMotionTracker = {
    acquireWidestFrontStream,
    ensureDetector,
    detectLandmarks
  };
})();
