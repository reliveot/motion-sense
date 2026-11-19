(() => {
  'use strict';

  async function acquireWidestFrontStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('此環境不支援相機 API，請使用 HTTPS 網址並以 Safari 或 Chrome 開啟');
    }

    // 使用輕量且與 MediaPipe 最相容的 4:3 原生比例（640x480）
    // 既能保住 4:3 左右寬度比例，又不會讓三星 S25 等手機推論過重而抓不到手
    const attempts = [
      {
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          aspectRatio: { ideal: 4 / 3 },
          frameRate: { ideal: 24, max: 30 }
        }
      },
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

  window.StarMotionTracker = {
    acquireWidestFrontStream
  };
})();
