import { startReplay, stopReplay, getReplayStatus } from "../services/replayService.js";
import { startReplaySchema } from "../validators/replayValidators.js";

/**
 * Starts a real-time replay session.
 */
export async function startReplayHandler(req, res) {
  const parsed = startReplaySchema.parse(req.body);
  const io = req.app.get("io");

  const result = await startReplay({
    datasetId: parsed.datasetId,
    ratePerSecond: parsed.ratePerSecond,
    user: req.user,
    io
  });

  res.status(200).json({
    status: "success",
    data: result
  });
}

/**
 * Stops the user's active replay session.
 */
export async function stopReplayHandler(req, res) {
  const io = req.app.get("io");
  const result = stopReplay(req.user._id.toString(), io);

  res.status(200).json({
    status: "success",
    data: result
  });
}

/**
 * Returns the status of the user's active replay.
 */
export async function getReplayStatusHandler(req, res) {
  const result = getReplayStatus(req.user._id.toString());

  res.status(200).json({
    status: "success",
    data: result
  });
}
