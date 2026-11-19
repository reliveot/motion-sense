(() => {
  'use strict';

  async function acquireWidestFrontStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('此環境不支援相機 API，請使用 HTTPS 網址並以 Safari 或 Chrome 開啟');
    }

    let preferredDeviceId = null;
    try {
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videos = devices.filter(d => d.kind === 'videoinput');
        const frontCandidates = videos.filter(d =>
          /front|user|前|selfie|facetime/i.test(d.label || '')
        );
        const wideFront = frontCandidates.find(d =>
          /ultra|wide|0\.5|廣角/i.test(d.label || '')
        );
        if (wideFront && wideFront.deviceId) {
          preferredDeviceId = wideFront.deviceId;
        }
      }
    } catch {}

    // 優先請求 4:3 完整感光元件比例（iPad / 多數前鏡頭原生為 4:3，避免被裁成 16:9）
    const attempts = [];
    if (preferredDeviceId) {
      attempts.push({
        audio: false,
        video: {
          deviceId: { exact: preferredDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 960 },
          frameRate: { ideal: 24, max: 30 }
        }
      });
    }
    attempts.push(
      {
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
          aspectRatio: { ideal: 4 / 3 },
          frameRate: { ideal: 24, max: 30 }
        }
      },
      {
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 }
        }
      },
      {
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 }
        }
      },
      {
        audio: false,
        video: { facingMode: 'user' }
      }
    );

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

    try {
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities ? track.getCapabilities() : null;
      if (caps && caps.zoom && Number.isFinite(caps.zoom.min)) {
        await track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] });
      }
    } catch {}

    return stream;
  }

  window.StarMotionTracker = {
    acquireWidestFrontStream
  };
})();
