/** Minutes before kickoff when predictions close. */
export const PREDICTION_LOCK_MINUTES_BEFORE = 15

const MS = 60_000

/**
 * The user can edit a prediction only if the match is not final
 * and the lock window has not been reached yet (kickoff − N minutes).
 */
export function getPredictionCloseTime(startTime: Date): Date {
  return new Date(startTime.getTime() - PREDICTION_LOCK_MINUTES_BEFORE * MS)
}

export function isPredictionWindowOpen(
  startTime: Date,
  nowMs: number = Date.now()
): boolean {
  return nowMs < getPredictionCloseTime(startTime).getTime()
}

/** Editable prediction: match not final and the window hasn't closed yet. */
export function canEditPrediction(
  match: { isFinal: boolean; startTime: Date },
  nowMs: number = Date.now()
): boolean {
  return !match.isFinal && isPredictionWindowOpen(match.startTime, nowMs)
}
