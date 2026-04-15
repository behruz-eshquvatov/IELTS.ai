function buildBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  return Buffer.from(value || []);
}

function sendAudioStreamResponse(req, res, audioData, options = {}) {
  const audioBuffer = buildBuffer(audioData);
  const totalSize = audioBuffer.length;
  const mimeType = options.mimeType || "audio/mpeg";
  const fileName = options.fileName || "audio.mp3";
  const rangeHeader = String(req.headers.range || "").trim();

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

  if (!rangeHeader.startsWith("bytes=")) {
    res.setHeader("Content-Length", totalSize);
    return res.status(200).send(audioBuffer);
  }

  const rawRange = rangeHeader.replace("bytes=", "");
  const [startRaw, endRaw] = rawRange.split("-");
  let start = Number.parseInt(startRaw, 10);
  let end = endRaw ? Number.parseInt(endRaw, 10) : totalSize - 1;

  if (Number.isNaN(start)) {
    start = 0;
  }

  if (Number.isNaN(end) || end >= totalSize) {
    end = totalSize - 1;
  }

  if (start < 0 || start >= totalSize || end < start) {
    res.setHeader("Content-Range", `bytes */${totalSize}`);
    return res.status(416).end();
  }

  const chunk = audioBuffer.subarray(start, end + 1);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  res.setHeader("Content-Length", chunk.length);
  return res.status(206).send(chunk);
}

module.exports = {
  sendAudioStreamResponse,
};
