export async function openCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function closeCamera(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function capture(video, max = 1024) {
  const scale = Math.min(
    1,
    max / Math.max(video.videoWidth, video.videoHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((ready) => canvas.toBlob(ready, "image/jpeg", 0.85));
}
